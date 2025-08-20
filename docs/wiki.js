document.addEventListener('DOMContentLoaded', () => {
    // Wikiページの一覧 (ファイル名から.mdを除いたもの)
    const wikiPages = [
        '_Footer',
        'AAA',
        'bug-report-template',
        'ci-build',
        'Gemini',
        'git-workflow',
        'Home',
        'project-list',
        'project-template',
        'README',
        'testing-basics'
    ];

    const menu = document.getElementById('wiki-menu');
    const content = document.getElementById('wiki-content');
    let currentActiveLink = null;

    // ナビゲーションメニューを生成
    wikiPages.forEach(page => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = page.replace(/-/g, ' '); // ハイフンをスペースに
        a.href = `#${page}`;
        li.appendChild(a);
        menu.appendChild(li);
    });

    // ページの読み込みと表示を行う関数
    async function loadPage(pageName) {
        // デフォルトページが指定されていない場合はHomeを表示
        if (!pageName) {
            pageName = 'Home';
        }

        try {
            const response = await fetch(`../gittest-wiki.wiki/${pageName}.md`);
            if (!response.ok) {
                throw new Error('ページの読み込みに失敗しました。');
            }
            const markdown = await response.text();
            content.innerHTML = marked.parse(markdown);

            // アクティブなリンクのスタイルを更新
            if (currentActiveLink) {
                currentActiveLink.classList.remove('active');
            }
            const newActiveLink = menu.querySelector(`a[href="#${pageName}"]`);
            if (newActiveLink) {
                newActiveLink.classList.add('active');
                currentActiveLink = newActiveLink;
            }

        } catch (error) {
            content.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    // URLのハッシュ変更を監視してページを読み込む
    window.addEventListener('hashchange', () => {
        const pageName = window.location.hash.substring(1);
        loadPage(pageName);
    });

    // 初期ページの読み込み
    const initialPage = window.location.hash.substring(1) || 'Home';
    loadPage(initialPage);
});
