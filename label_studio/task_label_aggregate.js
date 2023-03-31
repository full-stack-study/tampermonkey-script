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
        all_link = $('.ls-projects-page__list .ls-projects-page__link .ls-project-card__info').append(create_button())
    }

    init()


})()