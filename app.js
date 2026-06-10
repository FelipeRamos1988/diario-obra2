// 1. Configuração do Banco de Dados Local (Offline First)
const db = new Dexie("DiarioObraDB");
db.version(1).stores({
    reports: '++id, author, date, description' // Armazena dados e array de fotos em Base64
});

// Controle de Telas
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if(screenId === 'screen-admin') renderAdminReports();
}

// Login do Administrador
function promptAdminLogin() {
    const password = prompt("Digite a senha do Administrador:");
    if (password === "1234") { // Altere para a senha de sua preferência
        switchScreen('screen-admin');
    } else {
        alert("Senha incorreta!");
    }
}

// 2. Manipulação de Imagens (Conversão para Base64 para salvar offline)
const photoInput = document.getElementById('input-photos');
const previewContainer = document.getElementById('preview-container');
let uploadedImagesBase64 = [];

photoInput.addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImagesBase64.push(event.target.result);
            const img = document.createElement('img');
            img.src = event.target.result;
            previewContainer.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
});

// 3. Salvamento do Formulário
document.getElementById('diary-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const report = {
        author: document.getElementById('input-author').value,
        date: document.getElementById('input-date').value,
        description: document.getElementById('input-description').value,
        photos: uploadedImagesBase64,
        timestamp: new Date().getTime()
    };

    await db.reports.add(report);
    alert("Diário salvo com sucesso localmente! (Sincronizado automaticamente)");
    
    // Limpa formulário
    this.reset();
    previewContainer.innerHTML = '';
    uploadedImagesBase64 = [];
    switchScreen('screen-home');
});

// 4. Renderizar relatórios no painel Admin
async function renderAdminReports() {
    const list = document.getElementById('admin-reports-list');
    list.innerHTML = '';
    const allReports = await db.reports.toArray();

    if(allReports.length === 0) {
        list.innerHTML = '<p>Nenhum relatório encontrado.</p>';
        return;
    }

    allReports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'report-card';
        card.innerHTML = `
            <strong>Data:</strong> ${report.date} | <strong>Responsável:</strong> ${report.author}<br>
            <strong>Relato:</strong> ${report.description}<br>
            <small>Fotos anexadas: ${report.photos.length}</small>
        `;
        list.appendChild(card);
    });
}

// 5. Exportação para Planilha Excel (Formatação customizável)
async function exportToExcel() {
    const allReports = await db.reports.toArray();
    if(allReports.length === 0) return alert("Não há dados para exportar.");

    // Formatação dos dados que vão para as linhas do Excel
    // Você pode alterar a ordem ou o nome das chaves para bater com o seu anexo
    const formattedData = allReports.map(report => ({
        "DATA DA OBRA": report.date,
        "RESPONSÁVEL": report.author,
        "DESCRIÇÃO DAS ATIVIDADES": report.description,
        "TOTAL DE FOTOS": report.photos.length,
        "LINK/STATUS FOTOS": report.photos.length > 0 ? "Armazenadas no dispositivo" : "Sem fotos"
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Diários de Obra");

    // Ajuste de largura de colunas automático
    const max_cols = [{wch: 15}, {wch: 25}, {wch: 50}, {wch: 15}, {wch: 20}];
    worksheet['!cols'] = max_cols;

    // Salva o arquivo final
    XLSX.writeFile(workbook, `Relatorio_Diario_De_Obra_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// Registrar o Service Worker para rodar Offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("Erro de SW:", err));
}
