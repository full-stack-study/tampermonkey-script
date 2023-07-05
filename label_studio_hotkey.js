// ==UserScript==
// @name         label_studio_hotkey
// @namespace    https://github.com/full-stack-study/tampermonkey-script
// @version      2.0.1
// @description  给label_studio添加一些自定义的快捷键!
// @author       DiamondFsd
// @match        http://labelstudio2.shanhs.com.cn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
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

    function delete_task(task_id) {
        return fetch(`/api/tasks/${task_id}`, {method: 'DELETE'})
    }
    
    function add_function_button() {
        var button = document.createElement("button");
        button.innerHTML = "打开图片";

        // 设置按钮样式
        button.style.position = "fixed";
        button.style.top = "50%";
        button.style.left = "50%";
        button.style.transform = "translate(-50%, -50%)";

        // 将按钮添加到页面中
        document.body.appendChild(button);
        button.onclick = () => {
            console.log('hello world')
        }
    }

    add_function_button()

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

        if (e.key === '=') {
            $('.dm-table__cell img').css('max-height', '200%')
        }

        async function moveProject(move=true) {
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
            if (move) {
                to_next_task()
            }

        }
        if (e.key === 'x') {
            moveProject(false)
            to_next_task()
        }
        if (e.key === 'f') {
            document.querySelector('.lsf-controls button').click()
            setTimeout(async () => {
                moveProject()
            }, 500)
        }
    })
})();




(function () {
    'use strict';

    __lb_add_js(`https://cdn.bootcdn.net/ajax/libs/artDialog/7.0.0/dialog.js`)

    async function get_tasks(project_id, page_size) {
        const data = await fetch(`/api/tasks?project=${project_id}&page_size=${page_size}&fields=all`)
        return (await data.json())['tasks']
    }

    function aggregate_tasks(tasks) {
        const count_dict = {};
        const group_by_labal = {};

        for (let t of tasks) {
            for (let anno of t.annotations) {
                for (let r of anno.result) {
                    let label = ''
                    if (r.value.rectanglelabels && r.value.rectanglelabels.length) {
                        label = r.value.rectanglelabels[0];
                    } else if (r.value.polygonlabels && r.value.polygonlabels.length) {
                        label = r.value.polygonlabels[0];
                    }
                    if (label) {
                        count_dict[label] = (count_dict[label] || 0) + 1;
                        group_by_labal[label] = (group_by_labal[label] || new Set()).add(t.id)
                    }
                }
            }
        }
        return [count_dict, group_by_labal]
    }

    function createTableAndSortByCount(obj, show_label_detail) {
        // 将对象转换为数组
        const arr = Object.entries(obj);

        // 根据数量进行排序
        arr.sort((a, b) => b[1] - a[1]);

        // 创建表格元素
        const table = document.createElement("table");
        table.style = "width: 100%; border-collapse: collapse;"
        table.border = "1";

        // 创建表头
        const headerRow = table.insertRow();
        const header1 = headerRow.insertCell();
        const header2 = headerRow.insertCell();
        const header3 = headerRow.insertCell();
        header1.innerHTML = "问题";
        header2.innerHTML = "数量";
        header3.innerHTML = "操作";

        // 添加表格数据
        for (const item of arr) {
            const row = table.insertRow();
            const cell1 = row.insertCell();
            const cell2 = row.insertCell();
            const cell3 = row.insertCell();
            cell1.innerHTML = item[0];
            cell2.innerHTML = item[1];
            cell3.innerHTML = `<button class="label_agg_detail_button" data-label="${item[0]}">明细</button>`
        }

        $(table).find('.label_agg_detail_button').on('click', e => {
            const label_name = $(e.target).data('label')
            show_label_detail(label_name)
        })

        // 返回表格元素
        return table;
    }


    async function show_project_label_agg(project_id, project_name, page_size) {
        const temp_id = 'label_state_' + Date.now()
        const temp_detail_id = temp_id + "_tmp"
        const d = dialog({
            title: `${project_name} 标签统计`,
            content: `
            <div style="width: 400px">
                <div id="${temp_id}">加载中...</div>
                <div id="${temp_detail_id}"></div>
            </div>`
        })
        d.showModal()
        const tasks = await get_tasks(project_id, page_size)
        const [count_group, ids_group] = aggregate_tasks(tasks)
        $(`#${temp_id}`).html(createTableAndSortByCount(count_group, label_name => {
            const ids = ids_group[label_name]
            console.log('label_name, ids', label_name, ids)
            const ids_a_href = Array.from(ids).slice(0, 50).map(id => `<a href="/projects/${project_id}/data?task=${id}" target="_blank">${id}</a>`).join(', ')
            $(`#${temp_detail_id}`).html(`前50个ID: ${ids_a_href}`)
        }))

    }



    function create_button() {
        const state_button = $('<button class="pl_aggregate_button">标签统计</button>')
        state_button.on('click', e => {
            e.preventDefault()
            const project_card = $(e.target).parents('.ls-projects-page__link')
            const project_name = project_card.find('.ls-project-card__title-text').text()
            const project_size = parseInt(project_card.find('.ls-project-card__total').text().split('/')[1])
            const project_id = project_card.attr('href').split('/').filter(a => a)[1]
            console.log('project_id', project_id)
            show_project_label_agg(project_id, project_name, project_size)
        })
        return state_button
    }
    function init() {
        $('.pl_aggregate_button').remove()
        const all_link = $('.ls-projects-page__list .ls-projects-page__link .ls-project-card__info').append(create_button())
    }

    setTimeout(() => {
        init()
    }, 1000)


})()
