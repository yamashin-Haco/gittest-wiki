document.addEventListener('DOMContentLoaded', () => {
    const repoForm = document.getElementById('repoForm');
    repoForm.addEventListener('submit', handleFormSubmit);
});

async function handleFormSubmit(event) {
    event.preventDefault();

    const pat = document.getElementById('pat').value;
    const owner = document.getElementById('owner').value;
    const repo = document.getElementById('repo').value;
    const projectNumber = parseInt(document.getElementById('projectNumber').value, 10);

    // UIをリセットし、ローディング表示などをここに追加できる
    resetUI();

    try {
        const projectData = await fetchProjectData(pat, owner, repo, projectNumber);
        if (projectData) {
            displayProject(projectData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`エラーが発生しました: ${error.message}`);
    }
}

async function fetchProjectData(pat, owner, repo, projectNumber) {
    const query = `
        query($owner: String!, $repo: String!, $projectNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                projectV2(number: $projectNumber) {
                    title
                    items(first: 100) { # 最大100件のアイテムを取得
                        nodes {
                            content {
                                ... on Issue {
                                    title
                                    url
                                    assignees(first: 5) {
                                        nodes { login }
                                    }
                                    labels(first: 10) {
                                        nodes { name, color }
                                    }
                                }
                                ... on DraftIssue {
                                    title
                                }
                            }
                            fieldValues(first: 10) {
                                nodes {
                                    ... on ProjectV2ItemFieldSingleSelectValue {
                                        name
                                        field {
                                            ... on ProjectV2SingleSelectField {
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${pat}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            query,
            variables: { owner, repo, projectNumber }
        }),
    });

    const json = await response.json();
    if (json.errors) {
        throw new Error(json.errors.map(e => e.message).join('\n'));
    }
    if (!json.data.repository.projectV2) {
        throw new Error('指定されたプロジェクトが見つかりません。リポジトリ名、プロジェクト番号を確認してください。');
    }
    return json.data.repository.projectV2;
}

function displayProject(projectData) {
    const container = document.getElementById('project-container');
    container.style.display = 'block';

    const projectTitle = document.getElementById('project-title');
    projectTitle.textContent = `プロジェクト: ${projectData.title}`;

    const columns = {};
    projectData.items.nodes.forEach(item => {
        if (!item.content) return; // コンテンツがないアイテムはスキップ

        const statusFieldValue = item.fieldValues.nodes.find(
            fieldValue => fieldValue.field && fieldValue.field.name === 'Status'
        );
        const status = statusFieldValue ? statusFieldValue.name : 'ステータス未設定';

        if (!columns[status]) {
            columns[status] = [];
        }
        columns[status].push(item.content);
    });

    renderChart(columns);
    renderBoard(columns);
}

function renderChart(columns) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    const labels = Object.keys(columns);
    const data = labels.map(label => columns[label].length);

    // 古いチャートがあれば破棄する
    if (window.myChart) {
        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'タスク数',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'プロジェクト進捗'
                }
            }
        }
    });
}

function renderBoard(columns) {
    const board = document.getElementById('projectBoard');
    board.innerHTML = ''; // ボードをクリア

    for (const columnName in columns) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'project-column';

        const title = document.createElement('h3');
        title.textContent = columnName;
        columnDiv.appendChild(title);

        columns[columnName].forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'task-card';
            
            const cardTitle = document.createElement('p');
            if (card.url) {
                const link = document.createElement('a');
                link.href = card.url;
                link.textContent = card.title;
                link.target = '_blank';
                cardTitle.appendChild(link);
            } else {
                cardTitle.textContent = card.title; // DraftIssueの場合
            }
            cardDiv.appendChild(cardTitle);

            if (card.assignees && card.assignees.nodes.length > 0) {
                const assigneeP = document.createElement('p');
                assigneeP.className = 'assignee';
                assigneeP.textContent = `担当: ${card.assignees.nodes.map(a => a.login).join(', ')}`;
                cardDiv.appendChild(assigneeP);
            }

            if (card.labels && card.labels.nodes.length > 0) {
                const labelsDiv = document.createElement('div');
                labelsDiv.className = 'labels';
                card.labels.nodes.forEach(label => {
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = label.name;
                    labelSpan.style.backgroundColor = `#${label.color}`;
                    // ラベルの文字色を背景色に合わせて調整
                    labelSpan.style.color = getContrastColor(label.color);
                    labelsDiv.appendChild(labelSpan);
                });
                cardDiv.appendChild(labelsDiv);
            }

            columnDiv.appendChild(cardDiv);
        });

        board.appendChild(columnDiv);
    }
}

function resetUI() {
    const container = document.getElementById('project-container');
    container.style.display = 'none';
    const board = document.getElementById('projectBoard');
    board.innerHTML = '';
    const projectTitle = document.getElementById('project-title');
    projectTitle.textContent = '';
    if (window.myChart) {
        window.myChart.destroy();
    }
}

// 背景色に応じて文字色を白か黒に決定するヘルパー関数
function getContrastColor(hexcolor){
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? 'black' : 'white';
}
