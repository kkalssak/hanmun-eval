let currentSubjectData = null;
let currentStandards = [];
let selectedItems = [];

// 1. 교육과정 & 학교급별 과목 연동
const subjectMap = {
    "2015": { "중학교": ["한문"], "고등학교": ["한문Ⅰ", "한문Ⅱ", "(고시외)생활과 한문"] },
    "2022": { "중학교": ["한문"], "고등학교": ["한문", "언어생활과 한자", "한문고전읽기"] }
};

function updateSubjectDropdown() {
    const cur = document.getElementById('curriculum-select').value;
    const lvl = document.getElementById('school-select').value;
    const subjectSelect = document.getElementById('subject-select');
    subjectSelect.innerHTML = '';
    const subjects = subjectMap[cur][lvl] || [];
    subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub; option.textContent = sub;
        subjectSelect.appendChild(option);
    });
}
document.getElementById('curriculum-select').addEventListener('change', updateSubjectDropdown);
document.getElementById('school-select').addEventListener('change', updateSubjectDropdown);
updateSubjectDropdown();

// 2. 조회 버튼 클릭
document.getElementById('search-btn').addEventListener('click', () => {
    const cur = document.getElementById('curriculum-select').value;
    const lvl = document.getElementById('school-select').value;
    const sub = document.getElementById('subject-select').value;
    
    currentSubjectData = db.find(d => d.curriculum === cur && d.schoolLevel === lvl && d.subject === sub);
    
    const listDiv = document.getElementById('standards-list');
    const listHeader = document.getElementById('list-header');
    const selectAllCheckbox = document.getElementById('select-all');
    
    listDiv.innerHTML = ''; 
    selectedItems = []; 
    selectAllCheckbox.checked = false; 

    if (currentSubjectData && currentSubjectData.standards) {
        listHeader.style.display = 'block'; 
        currentStandards = currentSubjectData.standards;
        
        currentStandards.forEach(std => {
            const div = document.createElement('div');
            div.className = 'check-item';
            div.innerHTML = `<input type="checkbox" id="${std.code}" value="${std.code}"><label for="${std.code}"><strong>${std.code}</strong> ${std.title}</label>`;
            
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedItems.push({ ...std, curriculum: cur });
                } else {
                    selectedItems = selectedItems.filter(item => item.code !== e.target.value);
                    selectAllCheckbox.checked = false;
                }
            });
            listDiv.appendChild(div);
        });
    } else {
        listHeader.style.display = 'none';
        listDiv.innerHTML = '<p style="text-align:center; color:red; margin-top:80px;">해당 과목의 데이터가 없습니다.</p>';
    }
});

// 3. 전체 선택/해제 기능
document.getElementById('select-all').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('#standards-list input[type="checkbox"]');
    const cur = document.getElementById('curriculum-select').value;
    
    selectedItems = []; 
    
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
            const std = currentStandards.find(s => s.code === cb.value);
            if (std) selectedItems.push({ ...std, curriculum: cur });
        }
    });
});

// 4. 결과 생성 로직
document.getElementById('generate-btn').addEventListener('click', () => {
    if (selectedItems.length === 0) return alert("성취기준을 선택해주세요.");
    
    const tbody = document.getElementById('result-tbody');
    const domainBody = document.getElementById('domain-tbody');
    tbody.innerHTML = '';
    domainBody.innerHTML = '';
    let combinedText = { A: "", B: "", C: "", D: "", E: "" };

    // --- (1) 성취기준 표 및 텍스트 ---
    selectedItems.forEach(item => {
        let tableRows = [];
        if (item.curriculum === "2015") {
            tableRows = [
                { label: '상', text: item.levels.A },
                { label: '중', text: item.levels.C },
                { label: '하', text: item.levels.E }
            ];
        } else {
            ['A', 'B', 'C', 'D', 'E'].forEach(g => {
                if (item.levels[g]) tableRows.push({ label: g, text: item.levels[g] });
            });
        }

        tableRows.forEach((row, idx) => {
            const tr = document.createElement('tr');
            if (idx === 0) {
                tr.innerHTML = `<td rowspan="${tableRows.length}" style="vertical-align:middle;"><strong>${item.code}</strong><br>${item.title}</td>
                                <td style="text-align:center; font-weight:bold;">${row.label}</td><td>${row.text}</td>`;
            } else {
                tr.innerHTML = `<td style="text-align:center; font-weight:bold;">${row.label}</td><td>${row.text}</td>`;
            }
            tbody.appendChild(tr);
        });

        ['A', 'B', 'C', 'D', 'E'].forEach(g => {
            if (item.levels[g]) combinedText[g] += item.levels[g] + " ";
        });
    });

    ['A', 'B', 'C', 'D', 'E'].forEach(g => {
        document.getElementById(`text-${g}`).value = combinedText[g].trim();
    });

    // --- (2) 영역별 성취수준 표 그리기 ---
    if (currentSubjectData && currentSubjectData.domains && currentSubjectData.domains.length > 0) {
        currentSubjectData.domains.forEach(domain => {
            let tableRows = [];
            
            ['A', 'B', 'C', 'D', 'E'].forEach(g => {
                const lvl = domain.levels[g];
                if (lvl) {
                    if (typeof lvl === 'object') {
                        tableRows.push({ grade: g, type: '지식·이해', text: lvl.knowledge, rowspan: 3, isFirst: true });
                        tableRows.push({ grade: g, type: '과정·기능', text: lvl.process, rowspan: 0, isFirst: false });
                        tableRows.push({ grade: g, type: '가치·태도', text: lvl.attitude, rowspan: 0, isFirst: false });
                    } else {
                        tableRows.push({ grade: g, type: '-', text: lvl, rowspan: 1, isFirst: true });
                    }
                }
            });

            tableRows.forEach((row, idx) => {
                const tr = document.createElement('tr');
                let html = '';
                
                if (idx === 0) {
                    html += `<td rowspan="${tableRows.length}" style="vertical-align:middle; text-align:center; font-weight:bold; background:#f4f6f9;">${domain.name}</td>`;
                }
                
                if (row.isFirst) {
                    html += `<td rowspan="${row.rowspan}" style="vertical-align:middle; text-align:center; font-weight:bold; font-size:16px;">${row.grade}</td>`;
                }
                
                if (row.type !== '-') {
                    html += `<td style="text-align:center; font-weight:bold; background:#fdfdfd; font-size:13px; color:#444;">${row.type}</td>`;
                } else {
                    html += `<td style="text-align:center; color:#999;">-</td>`;
                }
                
                html += `<td>${row.text}</td>`;
                tr.innerHTML = html;
                domainBody.appendChild(tr);
            });
        });
    } else {
        domainBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #d9534f; padding: 30px 0; font-weight:bold;">아직 data.js 파일에 해당 과목의 [영역별 데이터]가 입력되지 않았습니다.</td></tr>`;
    }
});

// --- 5. 복사 기능들 ---

window.copyTable = function(tableId) {
    const table = document.getElementById(tableId);
    let range, sel;
    if (document.createRange && window.getSelection) {
        range = document.createRange();
        sel = window.getSelection();
        sel.removeAllRanges();
        try { range.selectNodeContents(table); sel.addRange(range); } 
        catch (e) { range.selectNode(table); sel.addRange(range); }
        document.execCommand("copy");
        sel.removeAllRanges();
        alert("표가 복사되었습니다! 한글이나 워드 문서에 붙여넣기(Ctrl+V) 하시면 표 형태가 그대로 유지됩니다.");
    }
};

window.copyTextareas = function() {
    let combined = "";
    ['A', 'B', 'C', 'D', 'E'].forEach(grade => {
        const text = document.getElementById(`text-${grade}`).value;
        if (text) combined += `[${grade} 등급]\n${text}\n\n`;
    });
    if (!combined) return alert("복사할 내용이 없습니다.");
    navigator.clipboard.writeText(combined.trim()).then(() => alert("학기 단위 성취수준이 전체 복사되었습니다."));
};