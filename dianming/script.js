// 模拟学生数据
let students = [
    { id: '001', name: '张三', status: '', photo: '' },
    { id: '002', name: '李四', status: '', photo: '' },
    { id: '003', name: '王五', status: '', photo: '' },
    { id: '004', name: '赵六', status: '', photo: '' },
    { id: '005', name: '钱七', status: '', photo: '' },
    { id: '006', name: '孙八', status: '', photo: '' },
    { id: '007', name: '周九', status: '', photo: '' },
    { id: '008', name: '吴十', status: '', photo: '' },
    { id: '009', name: '郑十一', status: '', photo: '' },
    { id: '010', name: '王十二', status: '', photo: '' },
];

// 班级数据
let classes = [
    { id: 1, name: '高一(1)班', students: students },
    { id: 2, name: '高一(2)班', students: [] },
    { id: 3, name: '高一(3)班', students: [] }
];

// 当前班级
let currentClassId = 1;

// 已点名学生索引
let calledIndices = [];
let currentStudentIndex = -1;

// DOM元素
const studentsTableBody = document.getElementById('students-table-body');
const randomRollBtn = document.getElementById('random-roll');
const startRollBtn = document.getElementById('start-roll');
const resetRollBtn = document.getElementById('reset-roll');
const currentStudentCard = document.getElementById('current-student-card');
const studentName = document.getElementById('student-name');
const studentId = document.getElementById('student-id');
const studentPhoto = document.getElementById('student-photo');
const btnPresent = document.getElementById('btn-present');
const btnLate = document.getElementById('btn-late');
const btnAbsent = document.getElementById('btn-absent');
const totalStudentsEl = document.getElementById('total-students');
const calledStudentsEl = document.getElementById('called-students');
const presentStudentsEl = document.getElementById('present-students');
const lateStudentsEl = document.getElementById('late-students');
const absentStudentsEl = document.getElementById('absent-students');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const currentClassEl = document.getElementById('current-class');

// 导航元素
const navRollCall = document.getElementById('nav-roll-call');
const navClassManage = document.getElementById('nav-class-manage');
const navStudentManage = document.getElementById('nav-student-manage');
const navAttendance = document.getElementById('nav-attendance');
const navStatistics = document.getElementById('nav-statistics');

// 统计图表实例
let attendanceChart;

// 初始化
function init() {
    // 加载保存的数据
    loadData();
    
    // 初始化点名界面
    initRollCallPage();
    
    // 初始化导航事件
    initNavigation();
    
    // 初始化班级和学生管理
    initClassAndStudentManagement();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', handleKeyPress);
}

// 初始化点名界面
function initRollCallPage() {
    renderStudentsTable();
    updateStats();
    
    // 点名相关事件
    randomRollBtn.addEventListener('click', randomRollCall);
    startRollBtn.addEventListener('click', startRollCall);
    resetRollBtn.addEventListener('click', resetRollCall);
    btnPresent.addEventListener('click', () => markStatus('present'));
    btnLate.addEventListener('click', () => markStatus('late'));
    btnAbsent.addEventListener('click', () => markStatus('absent'));
    
    // 数据导入导出
    importBtn.addEventListener('click', importStudents);
    exportBtn.addEventListener('click', exportAttendance);
    
    // 处理照片上传
    const photoInput = document.getElementById('student-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const photoPreview = document.getElementById('photo-preview');
                    if (photoPreview) {
                        photoPreview.innerHTML = `<img src="${e.target.result}" alt="学生照片预览">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// 初始化导航
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            e.preventDefault();
            const contentId = navItem.id.replace('nav-', '') + '-content';
            
            // 更新导航样式
            navLinks.forEach(link => link.classList.remove('active'));
            navItem.classList.add('active');
            
            // 切换内容区域
            switchContent(contentId, navItem.id);
        });
    });
}

// 切换内容区域
function switchContent(contentId, navId) {
    // 隐藏所有内容
    document.querySelectorAll('.main-content').forEach(content => {
        if (content) {
            content.style.display = 'none';
        }
    });
    
    // 显示目标内容
    const targetContent = document.getElementById(contentId);
    if (targetContent) {
        targetContent.style.display = 'flex';
        
        // 根据导航项执行相应操作
        switch(navId) {
            case 'nav-roll-call':
                renderStudentsTable();
                updateStats();
                break;
                
            case 'nav-class-manage':
                renderClassesTable();
                break;
                
            case 'nav-student-manage':
                renderStudentsManageTable();
                const currentClassStudent = document.getElementById('current-class-student');
                if (currentClassStudent) {
                    currentClassStudent.textContent = getCurrentClassName();
                }
                break;
                
            case 'nav-statistics':
                if (!attendanceChart) {
                    initStatistics();
                } else {
                    updateStatistics();
                }
                break;
                
            case 'nav-attendance':
                alert('考勤记录功能正在开发中...');
                break;
        }
    }
}

// 设置活动导航
function setActiveNav(navElement) {
    const navItems = document.querySelectorAll('nav a');
    navItems.forEach(item => item.classList.remove('active'));
    navElement.classList.add('active');
}

// 显示指定内容区域
function showContent(contentId) {
    // 首先隐藏所有内容区域
    const contentElements = document.querySelectorAll('.main-content');
    contentElements.forEach(element => {
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // 显示指定内容区域
    const targetContent = document.getElementById(contentId);
    if (targetContent) {
        targetContent.style.display = 'flex';
        // 如果是统计面板，确保图表正确显示
        if (contentId === 'statistics-content' && attendanceChart) {
            attendanceChart.resize();
        }
    }
}

// 处理键盘快捷键
function handleKeyPress(e) {
    // 如果当前有学生被选中
    if (currentStudentIndex >= 0) {
        if (e.key === '1' || e.key === 'p') {
            markStatus('present');
        } else if (e.key === '2' || e.key === 'l') {
            markStatus('late');
        } else if (e.key === '3' || e.key === 'a') {
            markStatus('absent');
        }
    }
    
    // 随机点名快捷键
    if (e.key === 'r') {
        randomRollCall();
    }
    
    // 开始点名快捷键
    if (e.key === 's') {
        startRollCall();
    }
}

// 渲染学生表格
function renderStudentsTable() {
    studentsTableBody.innerHTML = '';
    students.forEach((student, index) => {
        const row = document.createElement('tr');
        if (index === currentStudentIndex) {
            row.classList.add('highlighted');
        }
        
        row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td class="status-${student.status}">${getStatusText(student.status)}</td>
        `;
        
        studentsTableBody.appendChild(row);
    });
}

// 获取状态文本
function getStatusText(status) {
    switch(status) {
        case 'present': return '出勤';
        case 'late': return '迟到';
        case 'absent': return '缺席';
        default: return '';
    }
}

// 随机点名
function randomRollCall() {
    // 如果所有学生都已点名，则提示
    if (calledIndices.length >= students.length) {
        alert('所有学生已点名完毕！');
        return;
    }
    
    // 随机选择未点名的学生
    let availableIndices = [];
    for (let i = 0; i < students.length; i++) {
        if (!calledIndices.includes(i)) {
            availableIndices.push(i);
        }
    }
    
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    currentStudentIndex = availableIndices[randomIndex];
    
    // 显示当前学生信息
    showCurrentStudent();
    
    // 播放点名音效
    playRollCallSound();
}

// 播放点名音效
function playRollCallSound() {
    // 在实际应用中，可以添加音效
    console.log('播放点名音效');
}

// 开始顺序点名
function startRollCall() {
    // 找到第一个未点名的学生
    for (let i = 0; i < students.length; i++) {
        if (!calledIndices.includes(i)) {
            currentStudentIndex = i;
            showCurrentStudent();
            return;
        }
    }
    
    alert('所有学生已点名完毕！');
}

// 显示当前学生信息
function showCurrentStudent() {
    if (currentStudentIndex >= 0 && currentStudentIndex < students.length) {
        const student = students[currentStudentIndex];
        studentName.textContent = student.name;
        studentId.textContent = `学号: ${student.id}`;
        studentPhoto.innerHTML = student.photo ? `<img src="${student.photo}" alt="${student.name}">` : '头像';
        currentStudentCard.style.display = 'block';
        
        // 高亮显示当前学生
        renderStudentsTable();
    }
}

// 标记学生状态
function markStatus(status) {
    if (currentStudentIndex >= 0 && currentStudentIndex < students.length) {
        students[currentStudentIndex].status = status;
        
        // 添加到已点名列表
        if (!calledIndices.includes(currentStudentIndex)) {
            calledIndices.push(currentStudentIndex);
        }
        
        // 更新表格和统计
        renderStudentsTable();
        updateStats();
        
        // 自动点下一个学生
        if (calledIndices.length < students.length) {
            setTimeout(startRollCall, 500);
        } else {
            currentStudentCard.style.display = 'none';
            alert('所有学生已点名完毕！');
        }
    }
}

// 重置点名
function resetRollCall() {
    if (confirm('确定要重置点名吗？所有考勤记录将被清空。')) {
        students.forEach(student => {
            student.status = '';
        });
        calledIndices = [];
        currentStudentIndex = -1;
        currentStudentCard.style.display = 'none';
        
        renderStudentsTable();
        updateStats();
    }
}

// 更新统计数据
function updateStats() {
    const total = students.length;
    const called = calledIndices.length;
    const present = students.filter(s => s.status === 'present').length;
    const late = students.filter(s => s.status === 'late').length;
    const absent = students.filter(s => s.status === 'absent').length;

    totalStudentsEl.textContent = total;
    calledStudentsEl.textContent = called;
    presentStudentsEl.textContent = present;
    lateStudentsEl.textContent = late;
    absentStudentsEl.textContent = absent;

    updateStatistics();
}

// 初始化统计功能
function initStatistics() {
    try {
        // 获取画布元素
        const canvas = document.getElementById('attendanceChart');
        if (!canvas) {
            console.error('找不到统计图表画布元素');
            return;
        }

        // 获取2D上下文
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('无法获取画布上下文');
            return;
        }

        // 如果已存在图表实例，先销毁
        if (attendanceChart) {
            attendanceChart.destroy();
        }

        // 创建新的饼图
        attendanceChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['出勤', '迟到', '缺席'],
                datasets: [{
                    label: '出勤情况',
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#4CAF50',  // 出勤 - 绿色
                        '#FF9800',  // 迟到 - 橙色
                        '#F44336'   // 缺席 - 红色
                    ],
                    borderColor: [
                        '#388E3C',
                        '#F57C00',
                        '#D32F2F'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            },
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: '出勤情况统计',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value}人 (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
                }
            }
        });

        // 更新统计数据
        updateStatistics();

    } catch (error) {
        console.error('初始化统计图表时发生错误:', error);
    }
}

// 更新统计数据
function updateStatistics() {
    try {
        // 获取当前班级的学生数据
        const currentClass = classes.find(c => c.id === currentClassId);
        const currentStudents = currentClass ? currentClass.students : students;
        
        // 计算统计数据
        const total = currentStudents.length;
        const present = currentStudents.filter(s => s.status === 'present').length;
        const late = currentStudents.filter(s => s.status === 'late').length;
        const absent = currentStudents.filter(s => s.status === 'absent').length;
        const uncalled = total - (present + late + absent);

        // 更新统计卡片
        const elements = {
            attendanceRate: document.getElementById('attendanceRate'),
            lateRate: document.getElementById('lateRate'),
            absentRate: document.getElementById('absentRate'),
            totalStudentsStat: document.getElementById('totalStudentsStat')
        };

        // 更新各个统计数据
        if (elements.attendanceRate) {
            elements.attendanceRate.textContent = total ? `${((present / total) * 100).toFixed(1)}%` : '0%';
        }
        if (elements.lateRate) {
            elements.lateRate.textContent = total ? `${((late / total) * 100).toFixed(1)}%` : '0%';
        }
        if (elements.absentRate) {
            elements.absentRate.textContent = total ? `${((absent / total) * 100).toFixed(1)}%` : '0%';
        }
        if (elements.totalStudentsStat) {
            elements.totalStudentsStat.textContent = total;
        }

        // 更新饼图
        if (attendanceChart) {
            // 更新数据
            attendanceChart.data.datasets[0].data = [present, late, absent];
            
            // 更新标签
            attendanceChart.data.labels = [
                `出勤 (${present}人)`,
                `迟到 (${late}人)`,
                `缺席 (${absent}人)`
            ];
            
            // 刷新图表
            attendanceChart.update('none'); // 使用 'none' 参数来禁用动画，加快更新
        }

    } catch (error) {
        console.error('更新统计数据时发生错误:', error);
    }
}

// 导入学生名单
function importStudents() {
    const fileInput = document.getElementById('import-file');
    if (fileInput.files.length === 0) {
        alert('请先选择要导入的文件');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // 这里简化处理，假设是CSV格式
            const content = e.target.result;
            const lines = content.split('\n');
            
            // 清空现有学生
            students = [];
            
            // 解析每行数据
            for (let i = 1; i < lines.length; i++) { // 跳过标题行
                const line = lines[i].trim();
                if (line) {
                    const [id, name] = line.split(',');
                    students.push({ id, name, status: '', photo: '' });
                }
            }
            
            // 更新界面
            renderStudentsTable();
            updateStats();
            
            alert(`成功导入 ${students.length} 名学生`);
        } catch (error) {
            alert('导入失败，请检查文件格式');
            console.error(error);
        }
    };
    
    reader.readAsText(file);
}

// 导出考勤记录
function exportAttendance() {
    // 创建CSV内容
    let csvContent = "学号,姓名,状态\n";
    
    students.forEach(student => {
        csvContent += `${student.id},${student.name},${getStatusText(student.status)}\n`;
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // 设置下载属性
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `考勤记录_${currentClassEl.textContent}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 保存数据到本地存储
function saveData() {
    const data = {
        classes: classes,
        currentClassId: currentClassId,
        calledIndices: calledIndices,
        students: students
    };
    
    localStorage.setItem('rollCallData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadData() {
    const data = localStorage.getItem('rollCallData');
    if (data) {
        const parsedData = JSON.parse(data);
        classes = parsedData.classes;
        currentClassId = parsedData.currentClassId;
        calledIndices = parsedData.calledIndices;
        students = parsedData.students;

        const currentClass = classes.find(c => c.id === currentClassId);
        if (currentClass) {
            students = currentClass.students;
            currentClassEl.textContent = currentClass.name;
        }
    }
}

// 获取当前班级名称
function getCurrentClassName() {
    const currentClass = classes.find(cls => cls.id === currentClassId);
    return currentClass ? currentClass.name : '未选择班级';
}

// 渲染班级表格
function renderClassesTable() {
    const classesTableBody = document.getElementById('classes-table-body');
    classesTableBody.innerHTML = '';
    
    classes.forEach(cls => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cls.id}</td>
            <td>${cls.name}</td>
            <td>${cls.students.length}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${cls.id}">编辑</button>
                <button class="action-btn delete-btn" data-id="${cls.id}">删除</button>
                <button class="action-btn switch-btn" data-id="${cls.id}">${cls.id === currentClassId ? '当前' : '切换'}</button>
            </td>
        `;
        classesTableBody.appendChild(row);
    });
    
    // 添加事件监听
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = parseInt(this.getAttribute('data-id'));
            editClass(classId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = parseInt(this.getAttribute('data-id'));
            deleteClass(classId);
        });
    });
    
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = parseInt(this.getAttribute('data-id'));
            switchClass(classId);
        });
    });
}

// 编辑班级
function editClass(classId) {
    const classToEdit = classes.find(cls => cls.id === classId);
    if (classToEdit) {
        document.getElementById('class-id').value = classToEdit.id;
        document.getElementById('class-name').value = classToEdit.name;
        document.getElementById('class-description').value = classToEdit.description || '';
    }
}

// 删除班级
function deleteClass(classId) {
    // 不允许删除当前选中的班级
    if (classId === currentClassId) {
        alert('不能删除当前正在使用的班级！');
        return;
    }
    
    if (confirm('确定要删除这个班级吗？此操作不可撤销！')) {
        const index = classes.findIndex(cls => cls.id === classId);
        if (index !== -1) {
            classes.splice(index, 1);
            renderClassesTable();
            saveData();
        }
    }
}

// 切换班级
function switchClass(classId) {
    if (classId === currentClassId) return;
    
    currentClassId = classId;
    const currentClass = classes.find(cls => cls.id === currentClassId);
    students = currentClass.students;
    
    // 更新界面
    currentClassEl.textContent = currentClass.name;
    document.getElementById('current-class-student').textContent = currentClass.name;
    renderStudentsTable();
    renderClassesTable();
    resetRollCall();
    updateStats();
    saveData();
}

// 渲染学生管理表格
function renderStudentsManageTable() {
    const studentsManageTableBody = document.getElementById('students-manage-table-body');
    studentsManageTableBody.innerHTML = '';
    
    students.forEach((student, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" data-index="${index}"></td>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>
                <button class="action-btn edit-btn" data-index="${index}">编辑</button>
                <button class="action-btn delete-btn" data-index="${index}">删除</button>
            </td>
        `;
        studentsManageTableBody.appendChild(row);
    });
    
    // 添加事件监听
    document.querySelectorAll('#students-manage-table-body .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            editStudent(index);
        });
    });
    
    document.querySelectorAll('#students-manage-table-body .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteStudent(index);
        });
    });
}

// 编辑学生
function editStudent(index) {
    const studentToEdit = students[index];
    if (studentToEdit) {
        document.getElementById('student-id-input').value = studentToEdit.id;
        document.getElementById('student-name-input').value = studentToEdit.name;
        // 保存当前编辑的学生索引
        document.getElementById('student-id-input').setAttribute('data-edit-index', index);
    }
}

// 删除学生
function deleteStudent(index) {
    if (confirm('确定要删除这名学生吗？此操作不可撤销！')) {
        students.splice(index, 1);
        renderStudentsManageTable();
        renderStudentsTable();
        updateStats();
        saveData();
    }
}

// 初始化班级管理和学生管理的事件监听
function initClassAndStudentManagement() {
    // 保存班级按钮
    document.getElementById('save-class').addEventListener('click', function() {
        const classId = document.getElementById('class-id').value.trim();
        const className = document.getElementById('class-name').value.trim();
        const classDescription = document.getElementById('class-description').value.trim();
        
        if (!className) {
            alert('班级名称不能为空！');
            return;
        }
        
        // 检查是否是编辑现有班级
        const existingIndex = classes.findIndex(cls => cls.id.toString() === classId);
        
        if (existingIndex !== -1) {
            // 更新现有班级
            classes[existingIndex].name = className;
            classes[existingIndex].description = classDescription;
        } else {
            // 添加新班级
            const newId = classes.length > 0 ? Math.max(...classes.map(cls => cls.id)) + 1 : 1;
            classes.push({
                id: newId,
                name: className,
                description: classDescription,
                students: []
            });
        }
        
        // 清空表单
        document.getElementById('clear-class-form').click();
        
        // 更新界面
        renderClassesTable();
        saveData();
    });
    
    // 清空班级表单按钮
    document.getElementById('clear-class-form').addEventListener('click', function() {
        document.getElementById('class-id').value = '';
        document.getElementById('class-name').value = '';
        document.getElementById('class-description').value = '';
    });
    
    // 切换班级按钮
    document.getElementById('switch-class').addEventListener('click', function() {
        const classSelect = document.createElement('select');
        classSelect.innerHTML = classes.map(cls => 
            `<option value="${cls.id}" ${cls.id === currentClassId ? 'selected' : ''}>${cls.name}</option>`
        ).join('');
        
        const result = prompt('请选择要切换的班级：\n' + 
            classes.map((cls, index) => `${index + 1}. ${cls.name}`).join('\n') + 
            '\n\n请输入班级序号：');
        
        if (result) {
            const selectedIndex = parseInt(result) - 1;
            if (selectedIndex >= 0 && selectedIndex < classes.length) {
                switchClass(classes[selectedIndex].id);
            } else {
                alert('无效的班级序号！');
            }
        }
    });
    
    // 删除班级按钮
    document.getElementById('delete-class').addEventListener('click', function() {
        if (classes.length <= 1) {
            alert('至少需要保留一个班级！');
            return;
        }
        
        const result = prompt('请选择要删除的班级：\n' + 
            classes.filter(cls => cls.id !== currentClassId)
                .map((cls, index) => `${index + 1}. ${cls.name}`).join('\n') + 
            '\n\n请输入班级序号：');
        
        if (result) {
            const filteredClasses = classes.filter(cls => cls.id !== currentClassId);
            const selectedIndex = parseInt(result) - 1;
            if (selectedIndex >= 0 && selectedIndex < filteredClasses.length) {
                deleteClass(filteredClasses[selectedIndex].id);
            } else {
                alert('无效的班级序号！');
            }
        }
    });
    
    // 保存学生按钮
    document.getElementById('save-student').addEventListener('click', function() {
        const studentId = document.getElementById('student-id-input').value.trim();
        const studentName = document.getElementById('student-name-input').value.trim();
        
        if (!studentId || !studentName) {
            alert('学号和姓名不能为空！');
            return;
        }
        
        // 检查是否是编辑现有学生
        const editIndex = document.getElementById('student-id-input').getAttribute('data-edit-index');
        
        if (editIndex !== null && editIndex !== undefined && editIndex !== '') {
            // 更新现有学生
            students[editIndex].id = studentId;
            students[editIndex].name = studentName;
            document.getElementById('student-id-input').removeAttribute('data-edit-index');
        } else {
            // 检查学号是否已存在
            if (students.some(s => s.id === studentId)) {
                alert('该学号已存在！');
                return;
            }
            
            // 添加新学生
            students.push({
                id: studentId,
                name: studentName,
                status: '',
                photo: ''
            });
        }
        
        // 清空表单
        document.getElementById('clear-student-form').click();
        
        // 更新界面
        renderStudentsManageTable();
        renderStudentsTable();
        updateStats();
        saveData();
    });
    
    // 清空学生表单按钮
    document.getElementById('clear-student-form').addEventListener('click', function() {
        document.getElementById('student-id-input').value = '';
        document.getElementById('student-name-input').value = '';
        document.getElementById('student-id-input').removeAttribute('data-edit-index');
    });
    
    // 批量导入学生按钮
    document.getElementById('batch-import-btn').addEventListener('click', function() {
        document.getElementById('batch-import-file').click();
    });
    
    document.getElementById('batch-import-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n');
            
            // 跳过标题行
            if (lines.length > 1) {
                let newStudents = [];
                let duplicateCount = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const id = parts[0].trim();
                        const name = parts[1].trim();
                        
                        // 检查学号是否已存在
                        if (students.some(s => s.id === id) || newStudents.some(s => s.id === id)) {
                            duplicateCount++;
                            continue;
                        }
                        
                        newStudents.push({
                            id: id,
                            name: name,
                            status: '',
                            photo: ''
                        });
                    }
                }
                
                // 添加新学生
                students = students.concat(newStudents);
                
                // 更新界面
                renderStudentsManageTable();
                renderStudentsTable();
                updateStats();
                saveData();
                
                alert(`成功导入 ${newStudents.length} 名学生！${duplicateCount > 0 ? `有 ${duplicateCount} 条记录因学号重复被忽略。` : ''}`);
            }
        };
        reader.readAsText(file);
    });
    
    // 批量删除学生按钮
    document.getElementById('batch-delete-btn').addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('.student-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('请先选择要删除的学生！');
            return;
        }
        
        if (confirm(`确定要删除选中的 ${checkboxes.length} 名学生吗？此操作不可撤销！`)) {
            // 获取要删除的索引（从大到小排序，以便从后往前删除）
            const indicesToDelete = Array.from(checkboxes)
                .map(cb => parseInt(cb.getAttribute('data-index')))
                .sort((a, b) => b - a);
            
            // 从后往前删除，避免索引变化
            indicesToDelete.forEach(index => {
                students.splice(index, 1);
            });
            
            // 更新界面
            renderStudentsManageTable();
            renderStudentsTable();
            updateStats();
            saveData();
        }
    });
    
    // 全选/取消全选学生
    document.getElementById('select-all-students').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
    });
    
    // 学生搜索功能
    document.getElementById('student-search').addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const rows = document.querySelectorAll('#students-manage-table-body tr');
        
        rows.forEach(row => {
            const studentId = row.children[1].textContent.toLowerCase();
            const studentName = row.children[2].textContent.toLowerCase();
            
            if (studentId.includes(searchText) || studentName.includes(searchText)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    // 尝试加载保存的数据
    loadData();
    // 初始化界面
    init();
    // 初始化班级和学生管理
    initClassAndStudentManagement();
});
