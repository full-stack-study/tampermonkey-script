// ==UserScript==
// @name         label_studio_hotkey
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.tampermonkey.net/scripts.php?ext=dhdg&updated=true&version=4.18.1
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

const button = ``

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

(function() {
    'use strict';

    $("head").append(`<link rel="stylesheet" type="text/css" href="https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.css">`)
    $("head").append(`<script type="text/javascript" src="https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.js"></script>`)

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
                    const bj_project = find_project_by_name(pj_map, move_to_name)
                    if (bj_project) {
                        await move_task_to_project(task_id, bj_project.id)
                        delete_task(task_id)
                        show_message(`移动至 ${move_to_name} 成功`)                        
                    }
                    // 将对应
                }
            }, 0)
            to_next_task()

        }
    })
})();