// ==UserScript==
// @name         label_studio_hotkey
// @namespace    https://github.com/full-stack-study/tampermonkey-script
// @version      2.1.3
// @description  给label_studio添加一些自定义的快捷键!
// @author       DiamondFsd
// @match        http://labelstudio.shanhs.com.cn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==


function __lb_add_css(url) {
    $("head").append(`<link rel="stylesheet" type="text/css" href="${url}">`)
}

function __lb_add_js(url) {
    $("head").append(`<script type="text/javascript" src="${url}"></script>`)
}

function showImage(url) {
    // 创建并设置图片元素
    const img = document.createElement('img');
    img.src = url;

    const overlay_id = 'shs_image_overlay'
    // 创建遮罩层元素并添加样式
    let overlay = document.getElementById(overlay_id)
    if (overlay) {
        document.body.removeChild(overlay)
        return;
    }
    overlay = document.createElement('div')
    overlay.id = overlay_id
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 100000000;
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    // 初始缩放比例
    let scale = 1;
    // 初始鼠标按住后的位置
    let prevMouseX = 0;
    let prevMouseY = 0;
    // 初始图片偏移量
    let offsetX = 0;
    let offsetY = 0;

    // 点击遮罩层关闭弹窗
    overlay.addEventListener('click', function () {
        document.body.removeChild(overlay);
    });

    // 鼠标滚动缩放图片
    img.addEventListener('wheel', function (event) {
        event.preventDefault();
        // 根据滚轮方向计算缩放比例
        scale += event.deltaY * -0.01;
        // 设置缩放边界
        scale = Math.min(Math.max(0.2, scale), 5);
        img.style.transform = `scale(${scale})`;
    });

    // 鼠标按下时记录初始位置
    img.addEventListener('mousedown', function (event) {
        event.stopPropagation(); // 阻止事件冒泡

        // 设置鼠标样式
        img.style.cursor = 'grabbing';
        // 获取初始位置
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        // 获取初始图片偏移量
        const transformStyle = window.getComputedStyle(img).getPropertyValue('transform');
        const matrix = new DOMMatrix(transformStyle.replace('matrix(', '').replace(')', ''));
        offsetX = matrix.e;
        offsetY = matrix.f;
        // 注册mousemove和mouseup事件
        img.addEventListener('mousemove', dragImage);
        img.addEventListener('mouseup', stopDragging);
    });

    // 拖动图片
    function dragImage(event) {
        // 计算鼠标偏移量
        const deltaX = event.clientX - prevMouseX;
        const deltaY = event.clientY - prevMouseY;
        // 更新图片偏移量
        offsetX += deltaX;
        offsetY += deltaY;
        // 应用偏移量
        img.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
        // 更新鼠标位置
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
    }

    // 停止拖动图片
    function stopDragging() {
        img.style.cursor = 'grab';
        // 移除mousemove和mouseup事件
        img.removeEventListener('mousemove', dragImage);
        img.removeEventListener('mouseup', stopDragging);
    }

    // 将图片添加到遮罩层中
    overlay.appendChild(img);

    // 将遮罩层添加到body中
    document.body.appendChild(overlay);
}


(function () {
    'use strict';
    __lb_add_css('https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.css')
    __lb_add_js('https://cdn.bootcdn.net/ajax/libs/toastify-js/1.12.0/toastify.min.js')
    __lb_add_css('https://cdn.bootcdn.net/ajax/libs/viewerjs/1.11.5/viewer.css')
    __lb_add_js('https://cdn.bootcdn.net/ajax/libs/viewerjs/1.11.5/viewer.min.js')

    function delete_task(task_id) {
        task_id = task_id || get_task_id()
        return fetch(`/api/tasks/${task_id}`, {method: 'DELETE'})
    }

    let has_button_wrapper_id = undefined

    function create_button(text, onclick, hotkey) {
        if (!has_button_wrapper_id) {
            has_button_wrapper_id = "shs_button_wrapper"
            var divElement = document.createElement("div");

            // 设置ID属性
            divElement.id = has_button_wrapper_id;

            // 设置样式
            divElement.style.position = "fixed";
            divElement.style.top = '5px';
            divElement.style.left = "50%";
            divElement.style.zIndex = 100000;
            // 添加其他样式属性，如宽度、高度、背景颜色等

            // 将<div>元素添加到网页的<body>中
            document.body.appendChild(divElement);
        }
        var button = document.createElement("button");
        button.innerHTML = text;
        button.onclick = onclick
        const divEle = document.getElementById(has_button_wrapper_id)
        divEle.appendChild(button)
        if (hotkey) {
            button.innerHTML = `${text} (${hotkey})`;
            const eventFn = e => {
                if (!document.contains(button)) {
                    document.removeEventListener('keydown', eventFn)
                    return
                }
                if (e.ctrlKey) {
                    return;
                }
                if (e.key === hotkey || e.code === hotkey) {
                    onclick()
                }
            }
            document.addEventListener('keydown', eventFn)
        }
    }

    function delete_and_to_next() {
        const task_id = get_task_id()
        delete_task(task_id)
        show_message("删除任务成功" + task_id)
        to_next_task()
    }


    const project_promise_map = init_tools()

    detect_project_changed()

    const global_data = {}

    document.body.addEventListener('click', detect_project_changed)

    async function detect_project_changed() {
        console.log('begin detect_project_changed')
        setTimeout(async () => {
            init_function_button()
            console.log('detect_project_changed ', global_data)
        }, 1000)
    }
    function clean_function_button() {
        if (has_button_wrapper_id) {
            document.getElementById(has_button_wrapper_id).remove()
            has_button_wrapper_id = undefined
        }
    }

    function init_function_button() {
        clean_function_button()
        create_button('保存', save_task, 's')
        create_button('保存并下一个', save_and_to_next, 'w')
        create_button('上一个', to_before_task, 'q')
        create_button('下一个', to_next_task, 'e')
        create_button('移动到负样本', move_to_bg_task, 'f')
        create_button('删除任务', delete_and_to_next, 'd')

        let gallery
        create_button('打开照片', () => {
            if (gallery) {
                gallery.hide()
                gallery = undefined
                return
            }
            const img_url = Array.from(document.querySelectorAll('.lsf-main-view .ant-typography')).map(a => a.innerText).filter(a => a.indexOf('http') > -1)[0]
            const images = img_url.split(',')
            const imgContainer = document.createElement('div')
            images.forEach(item => {
                const imgEl = document.createElement('img')
                imgEl.src = item
                imgContainer.appendChild(imgEl)
            })
            gallery = new Viewer(imgContainer);
            gallery.show()
        }, 'Space')

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
        return params.get("task")
    }

    function get_current_project_id() {
        const cur_path = location.pathname
        const path_split = cur_path.split('/')
        return path_split[path_split.indexOf('projects') + 1]
    }

    async function get_task_info(task_id) {
        const response = await fetch(`/api/tasks/${task_id}?t=${Date.now()}`)
        return await response.json()
    }

    async function move_task_to_project(task_id, project_id, process_data) {
        console.log('begin move project', task_id, project_id)
        const {data, annotations} = await get_task_info(task_id)
        delete data.id
        delete data.dataId
        const newAnnotations = annotations.filter(r => r.result.length > 0).map(a => {
            a.result.forEach(item => {
                delete item.id
            })
            return {result: a.result}
        })
        const task_data = {
            data,
            annotations: newAnnotations
        }
        if (process_data) {
            const target_project_id = await process_data(task_data)
            project_id = target_project_id || project_id
        }
        const import_res = await fetch(`/api/tasks`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({data, project: project_id})
        })
        const taks_resp = await import_res.json()
        console.log('move_task_success', taks_resp)
        await fetch(`/api/tasks/${taks_resp.id}/annotations/`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify(task_data.annotations[0])
        })
        return project_id
    }

    function show_message(message) {
        Toastify({
            text: message,
            duration: Math.min(message / 4 * 1000, 3000)
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

    function save_task() {
        document.querySelector('.lsf-controls button').click()
    }

    function save_and_to_next() {
        save_task()
        setTimeout(() => {
            to_next_task()
        }, 500)
    }

    function to_before_task() {
        document.querySelector('.dm-table__row-wrapper_selected').previousSibling.click()
    }

    async function move_to_bg_task(move = true) {
        const task_id = get_task_id()
        if (task_id) {
            const pj_map = await project_promise_map
            const cur_project = pj_map[get_current_project_id()]
            console.log('cur_project', cur_project)
            const project_name = cur_project.title
            const base_name = project_name.endsWith('_BG') ? project_name.replace(/_BG$/, '') : project_name
            const task_info = await get_task_info(task_id)
            const has_annoataion = task_info.annotations.filter(a => a.result.length > 0).length
            const move_to_name = has_annoataion ? base_name : base_name + '_BG'
            const current_is_base_project = project_name === base_name
            if (has_annoataion && current_is_base_project) {
                clear_prediect(task_info.predictions)
                show_message('清除预测数据成功')
            } else {
                const bj_project = find_project_by_name(pj_map, move_to_name)
                if (bj_project) {
                    move_task_to_project(task_id, bj_project.id).then(() => delete_task(task_id))
                    show_message(`移动至 ${move_to_name} 成功`)
                }
            }
            // 将对应
        }
        if (move) {
            to_next_task()
        }
    }
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
        $('.ls-projects-page__list .ls-projects-page__link .ls-project-card__info').append(create_button())
    }

    setTimeout(() => {
        init()
    }, 1000)


})()
