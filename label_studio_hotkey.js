// ==UserScript==
// @name         label_studio_hotkey
// @namespace    https://github.com/full-stack-study/tampermonkey-script
// @version      1.1
// @description  给label_studio添加一些自定义的快捷键!
// @author       DiamondFsd
// @match        http://lablestudio.shanhs.com.cn/projects/*/data?tab=*&task=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @updateURL    https://raw.githubusercontent.com/full-stack-study/tampermonkey-script/main/label_studio_hotkey.js
// @grant        none
// ==/UserScript==


function __lb_add_css(url) {
    $("head").append(`<link rel="stylesheet" type="text/css" href="${url}">`)
}

function __lb_add_js(url) {
    $("head").append(`<script type="text/javascript" src="${url}"></script>`)
}


(function() {
    'use strict';
    __lb_add_css('https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.css')
    __lb_add_js('https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.js')
    __lb_add_js('https://raw.githubusercontent.com/full-stack-study/tampermonkey-script/main/label_studio/task_label_aggregate.js')

    
    function delete_task(task_id) {
        return fetch(`/api/tasks/${task_id}`, {method: 'DELETE'})
    }

    async function init_tools() {    
        const response = await fetch(`/api/projects?t=${Date.now()}`)
        const data = await response.json()
        const project_list = data.results
        const project_map = {}
        project_list.forEach(item => {
            project_map[item.id] = item
        })
        return project_map
    }


    function find_project_by_name(pj_map, name) {
        return Object.values(pj_map).filter(a => a.title === name)[0]

    }


    function get_task_id() {
        const params = new URLSearchParams(location.search)
        const task_id = params.get("task")
        return task_id
    }

    function get_current_project_id(){
        const cur_path = location.pathname
        const path_split = cur_path.split('/')
        return path_split[path_split.indexOf('projects') + 1]
    }
    async function get_task_info(task_id) {
        const response = await fetch(`/api/tasks/${task_id}?t=${Date.now()}`)
        const data = await response.json()
        return data
    }
    async function move_task_to_project(task_id, project_id) {
        console.log('begin move project', task_id, project_id)
        const {data, annotations} = await get_task_info(task_id)
        const task_data = [{
            data,
            annotations: annotations.filter(r => r.result.length > 0).map(a => {
            a.result.forEach(item => {
                delete item.id
            })
            return {result: a.result}
            })
        }]
        const import_res = await fetch(`/api/projects/${project_id}/import`, {method:'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(task_data) })
        console.log('move_task_success', await import_res.json())
    }

    function show_message(message) {
        Toastify({
            text: message,
            duration: Math.min(message/4 * 1000, 3000)
        }).showToast();
    }

    function to_next_task() {
        const selectedDom = document.querySelector('.dm-table__row-wrapper_selected')
        if (selectedDom.nextSibling) {
            selectedDom.nextSibling.click()
            document.querySelector('.dm-table__row-wrapper_selected').previousSibling.scrollIntoView()
        } else {
            show_message('已经是最后一个了')
        }
    }

    function delete_annotation_by_id(id) {
        return fetch(`/api/annotations/${id}`, {method: 'DELETE'})
    }

    function delete_prediction_by_id(id) {
        return fetch(`/api/predictions/${id}`, {method: 'DELETE'})
    }

    function clear_prediect(predictions) {
        if (predictions) {
            const all_delete_task = predictions.map(({id}) => delete_prediction_by_id(id))
            return Promise.all(all_delete_task)
        }
        return Promise.resolve()
    }

    async function clear_annotation_and_prediect(task_id) {
        const task_info = await get_task_info(task_id)
        const {annotations, predictions} = task_info
        annotations.forEach(({id}) => delete_annotation_by_id(id))
        clear_prediect(predictions)
    }
    
    const project_promise_map = init_tools()

    const state_rate = {
        success: 0,
        failed: 0
    }
    document.addEventListener('keydown', async e => {
        const task_id = get_task_id()
        if (!task_id) {
            return
        }

        if (e.key === 'q') {
            document.querySelector('.dm-table__row-wrapper_selected').previousSibling.click()
        }
        if (e.key === 'w') {
            document.querySelector('.lsf-controls button').click()
            setTimeout(() => {
                to_next_task()
            }, 500)
        }
        if (e.key === 's') {
            document.querySelector('.lsf-controls button').click()
        }
        if (e.key === 'e') {
            to_next_task()
        }

        if (e.key === 'd') {
            const params = new URLSearchParams(location.search)            
            delete_task(task_id)
            show_message("删除任务成功" + task_id)
            to_next_task()
        }

        if (e.key === 'c') {
            // 清除注解和预测数据https://raw.githubusercontent.com/full-stack-study/tampermonkey-script/main/label_studio_hotkey.jshttps://cdn4.shanhs.com/offline-upload/pro/20230310/8151682bf2a04aeaada0bafab35d0a1c.jpg
            clear_annotation_and_prediect(task_id)
            to_next_task()
            show_message("清除注解和预测成功" + task_id)
        }
        if (e.key === '+' || e.key === '-') {
            const is_add = e.key === '+'
            if (is_add) {
               state_rate.success += 1
            } else {
                state_rate.failed += 1
            }
            console.log('state_rate', JSON.stringify(state_rate))
             to_next_task()
        }

        if (e.key === 'f') {        
            document.querySelector('.lsf-controls button').click()
            setTimeout(async () => {
                if (task_id) {
                    const pj_map = await project_promise_map
                    const cur_project = pj_map[get_current_project_id()]
                    console.log('cur_project', cur_project)
                    const project_name = cur_project.title
                    const base_name = project_name.split("_")[0]
                    const task_info = await get_task_info(task_id)
                    const has_annoataion = task_info.annotations.filter(a => a.result.length > 0).length                    
                    const move_to_name = has_annoataion ? base_name : base_name +'_BG'
                    const current_is_base_project = project_name === base_name
                    if (has_annoataion && current_is_base_project) {
                        await clear_prediect(task_info.predictions)                        
                        show_message('清除预测数据成功')
                    } else {
                        const bj_project = find_project_by_name(pj_map, move_to_name)
                        if (bj_project) {
                            await move_task_to_project(task_id, bj_project.id)
                            delete_task(task_id)
                            show_message(`移动至 ${move_to_name} 成功`)                        
                        }
                    }                    
                    // 将对应
                }
                to_next_task()
            }, 500)   
        }
    })
})();