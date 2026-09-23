// 量水游戏 - 修复版
// 这个文件整合了所有游戏逻辑和事件处理，确保正确的初始化顺序

// 游戏关卡数据
const levels = [
  // 关卡1：使用5升和3升杯子，量出4升水
  {
    id: 1,
    cups: [5, 3],  // 水杯容量
    target: 4,      // 目标水量
    description: "5升和3升杯量出4升水",
    optimalSolution: 6
  },
  // 关卡2：使用7升和2升杯子，量出3升水
  {
    id: 2,
    cups: [7, 2],
    target: 3,
    description: "7升和2升杯量出3升水",
    optimalSolution: 4
  },
  // 关卡3：使用8升和3升杯子，量出4升水
  {
    id: 3,
    cups: [8, 3],
    target: 4,
    description: "8升和3升杯量出4升水",
    optimalSolution: 10
  },
  // 关卡4：使用9升和4升杯子，量出6升水
  {
    id: 4,
    cups: [9, 4],
    target: 6,
    description: "9升和4升杯量出6升水",
    optimalSolution: 8
  },
  // 关卡5：使用11升和6升杯子，量出8升水
  {
    id: 5,
    cups: [11, 6],
    target: 8,
    description: "11升和6升杯量出8升水",
    optimalSolution: 14
  }
];

// 玩家数据
let playerData = {
  currentLevel: 1,
  completedLevels: [],
  bestSteps: {}
};

// 游戏状态
let gameState = {
  cups: [5, 3],         // 当前关卡所用的杯子
  cupValues: [0, 0],    // 杯子当前水量
  cupMaxValues: [5, 3], // 杯子最大容量
  target: 4,            // 目标水量
  steps: [],            // 操作步骤记录
  history: [],          // 历史状态（用于撤销）
  success: false,       // 是否成功
  startTime: null,      // 游戏开始时间
  endTime: null,        // 游戏结束时间
  timerInterval: null   // 计时器ID
};

// 当前关卡数据
let currentLevelData = null;

// 音效元素
let pourSound, successSound, fillSound, emptySound, transferSound;

// 创建音效元素
function createSoundEffects() {
  // 创建装满水杯的音效
  fillSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-water-splash-1295.mp3');
  fillSound.preload = 'auto';
  fillSound.volume = 0.7;
  
  // 创建倒空水杯的音效
  emptySound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-water-pouring-from-a-bottle-2944.mp3');
  emptySound.preload = 'auto';
  emptySound.volume = 0.7;
  
  // 创建杯子间倒水的音效
  transferSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-water-droplet-tap-2356.mp3');
  transferSound.preload = 'auto';
  transferSound.volume = 0.8;
}

// 播放倒水音效
function playPourSound(type) {
  // 根据操作类型选择不同的音效
  let sound;
  switch (type) {
    case 'fill':
      sound = fillSound;
      break;
    case 'empty':
      sound = emptySound;
      break;
    case 'transfer':
      sound = transferSound;
      break;
    default:
      sound = pourSound;
  }
  
  // 如果音效存在，则播放
  if (sound) {
    try {
      // 重置播放位置并播放
      sound.currentTime = 0;
      sound.play().catch(e => {
        console.warn('播放音效失败:', e);
      });
    } catch (e) {
      console.error('音效播放错误:', e);
    }
  }
}

// 在DOM加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', function() {
  console.log('游戏初始化开始...');
  
  // 获取音效元素
  pourSound = document.getElementById('pourSound');
  successSound = document.getElementById('successSound');
  
  // 创建额外的音效元素
  createSoundEffects();
  
  // 加载用户数据
  loadUserData();
  
  // 初始化关卡选择器
  initLevelSelector();
  
  // 加载当前关卡
  loadLevel(playerData.currentLevel || 1);
  
  // 初始化计时器
  startTimer();
  
  // 绑定所有按钮事件
  bindAllButtonEvents();
  
  // 添加触摸事件处理
  initTouchEvents();
  
  // 添加移动设备优化
  optimizeForMobileDevices();
  
  console.log('游戏初始化完成，状态：', gameState);
});

// 加载用户数据
function loadUserData() {
  const savedData = localStorage.getItem('waterGamePlayerData');
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      playerData = {
        ...playerData,
        ...parsedData
      };
      console.log('加载玩家数据:', playerData);
    } catch (e) {
      console.error('加载玩家数据失败:', e);
    }
  }
}

// 保存用户数据
function saveUserData() {
  try {
    localStorage.setItem('waterGamePlayerData', JSON.stringify(playerData));
  } catch (e) {
    console.error('保存玩家数据失败:', e);
  }
}

// 初始化关卡选择器
function initLevelSelector() {
  const levelSelector = document.getElementById('level-selector-content');
  levelSelector.innerHTML = '';
  
  levels.forEach(level => {
    const levelButton = document.createElement('div');
    levelButton.className = 'level-button';
    levelButton.dataset.levelId = level.id;
    
    // 检查关卡是否已解锁
    const isCompleted = playerData.completedLevels.includes(level.id);
    const isUnlocked = level.id === 1 || playerData.completedLevels.includes(level.id - 1);
    
    if (isUnlocked) {
      levelButton.classList.add('unlocked');
    } else {
      levelButton.classList.add('locked');
    }
    
    if (isCompleted) {
      levelButton.classList.add('completed');
      const bestSteps = playerData.bestSteps[level.id] || '未记录';
      levelButton.innerHTML = `
        <div class="level-number">${level.id}</div>
        <div class="level-info">
          <div>最佳步数: ${bestSteps}</div>
          <div>最优解: ${level.optimalSolution}步</div>
        </div>
        <div class="level-completed">✓</div>
      `;
    } else {
      levelButton.innerHTML = `
        <div class="level-number">${level.id}</div>
        <div class="level-info">
          <div>${level.description}</div>
          <div>${isUnlocked ? '点击开始' : '未解锁'}</div>
        </div>
      `;
    }
    
    levelSelector.appendChild(levelButton);
  });
}

// 加载关卡
function loadLevel(levelId) {
  console.log('加载关卡:', levelId);
  // 查找关卡数据
  const levelIndex = levels.findIndex(lvl => lvl.id === levelId);
  if (levelIndex === -1) {
    console.error('关卡不存在:', levelId);
    return false;
  }
  
  // 更新当前关卡
  currentLevelData = levels[levelIndex];
  playerData.currentLevel = levelId;
  saveUserData();
  
  // 更新关卡信息显示
  document.getElementById('current-level').innerText = levelId;
  document.getElementById('level-goal').innerText = `目标：使用 ${currentLevelData.cups[0]} 升和 ${currentLevelData.cups[1]} 升的水杯，准确量出 ${currentLevelData.target} 升水`;
  
  // 更新最优解步数显示
  document.getElementById('optimal-steps-display').innerText = currentLevelData.optimalSolution;
  
  // 初始化游戏状态
  resetGame(true);
  return true;
}

// 重置游戏
function resetGame(skipLevelLoad = false) {
  // 关闭结果模态框
  document.getElementById('result-modal').style.display = 'none';
  
  if (!skipLevelLoad && !currentLevelData) {
    loadLevel(playerData.currentLevel || 1);
    return;
  }
  
  // 重置游戏状态
  gameState = {
    cups: currentLevelData.cups.slice(),
    cupValues: currentLevelData.cups.map(() => 0), // 初始杯子都是空的
    cupMaxValues: currentLevelData.cups.slice(),  // 最大容量就是杯子大小
    target: currentLevelData.target,
    steps: [],
    history: [],
    success: false,
    startTime: new Date(),
    endTime: null,
    timerInterval: null
  };
  
  // 重新启动计时器
  startTimer();
  
  // 更新按钮文本
  updateButtonLabels();
  
  // 更新界面
  updateDisplay();
}

// 更新按钮文本
function updateButtonLabels() {
  if (!gameState || !gameState.cupMaxValues) return;
  
  // 更新操作按钮文本
  document.getElementById('btn-fill-5').textContent = `装满${gameState.cupMaxValues[0]}升杯`;
  document.getElementById('btn-fill-3').textContent = `装满${gameState.cupMaxValues[1]}升杯`;
  document.getElementById('btn-pour-5').textContent = `倒空${gameState.cupMaxValues[0]}升杯`;
  document.getElementById('btn-pour-3').textContent = `倒空${gameState.cupMaxValues[1]}升杯`;
  document.getElementById('btn-5to3').textContent = `${gameState.cupMaxValues[0]}升杯倒入${gameState.cupMaxValues[1]}升杯`;
  document.getElementById('btn-3to5').textContent = `${gameState.cupMaxValues[1]}升杯倒入${gameState.cupMaxValues[0]}升杯`;
  
  // 更新杯子标签
  const cup5Label = document.querySelector('#cup-5 .cup-label');
  const cup3Label = document.querySelector('#cup-3 .cup-label');
  
  if (cup5Label) {
    cup5Label.innerHTML = `<span id="cup-5-value">0</span>/<span id="cup-5-max">${gameState.cupMaxValues[0]}</span> 升`;
  }
  
  if (cup3Label) {
    cup3Label.innerHTML = `<span id="cup-3-value">0</span>/<span id="cup-3-max">${gameState.cupMaxValues[1]}</span> 升`;
  }
}

// 更新水杯显示
function updateDisplay() {
  // 更新水杯标签和最大容量
  document.getElementById('cup-5-max').textContent = gameState.cupMaxValues[0];
  document.getElementById('cup-3-max').textContent = gameState.cupMaxValues[1];
  
  // 更新水量显示
  document.getElementById('cup-5-value').textContent = gameState.cupValues[0];
  document.getElementById('cup-3-value').textContent = gameState.cupValues[1];
  
  // 更新水位高度
  const cup5Water = document.getElementById('cup-5-water');
  const cup3Water = document.getElementById('cup-3-water');
  
  const percent5 = (gameState.cupValues[0] / gameState.cupMaxValues[0]) * 100;
  const percent3 = (gameState.cupValues[1] / gameState.cupMaxValues[1]) * 100;
  
  cup5Water.style.height = `${percent5}%`;
  cup3Water.style.height = `${percent3}%`;
  
  // 更新步数
  document.getElementById('step-count').textContent = gameState.steps.length;
  
  // 更新步骤列表
  const stepsList = document.getElementById('steps-list');
  stepsList.innerHTML = '';
  gameState.steps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    stepsList.appendChild(li);
  });
  
  // 检查是否达成目标
  checkSuccess();
}

// 检查是否达成目标
function checkSuccess() {
  if (gameState.success) return; // 已经成功了，不再检查
  
  // 检查是否有杯子达到目标水量
  const isSuccess = gameState.cupValues.some(val => val === gameState.target);
  
  if (isSuccess) {
    gameState.success = true;
    gameState.endTime = new Date();
    
    // 播放成功音效
    if (successSound) {
      successSound.currentTime = 0;
      successSound.volume = 0.8; // 设置音量
      successSound.play().catch(e => console.warn('播放成功音效失败:', e));
    }
    
    // 记录完成关卡
    if (!playerData.completedLevels.includes(currentLevelData.id)) {
      playerData.completedLevels.push(currentLevelData.id);
    }
    
    // 记录最佳步数
    const currentSteps = gameState.steps.length;
    const bestSteps = playerData.bestSteps[currentLevelData.id] || Infinity;
    
    if (currentSteps < bestSteps) {
      playerData.bestSteps[currentLevelData.id] = currentSteps;
    }
    
    // 保存用户数据
    saveUserData();
    
    // 显示结果
    setTimeout(() => {
      showResult();
    }, 500); // 等待音效播放一会再显示结果
  }
}

// 显示结果
function showResult() {
  // 停止计时器
  clearInterval(gameState.timerInterval);
  
  // 更新结果信息
  document.getElementById('completed-level').textContent = currentLevelData.id;
  document.getElementById('used-steps').textContent = gameState.steps.length;
  document.getElementById('optimal-steps').textContent = currentLevelData.optimalSolution;
  
  // 计算用时
  const timeUsed = Math.floor((gameState.endTime - gameState.startTime) / 1000);
  const minutes = Math.floor(timeUsed / 60);
  const seconds = timeUsed % 60;
  document.getElementById('used-time').textContent = `${minutes}分${seconds}秒`;
  
  // 显示结果模态框
  const modal = document.getElementById('result-modal');
  modal.style.display = 'flex';
  
  // 添加动画效果
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // 注意：成功音效已在checkSuccess函数中播放，这里不再重复播放
}

// 开始计时器
function startTimer() {
  // 清除旧计时器
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // 设置开始时间
  gameState.startTime = new Date();
  
  // 更新计时器显示
  updateTimer();
  
  // 启动计时器
  gameState.timerInterval = setInterval(updateTimer, 1000);
}

// 更新计时器
function updateTimer() {
  if (!gameState.startTime) return;
  
  const now = new Date();
  const timeUsed = Math.floor((now - gameState.startTime) / 1000);
  const minutes = Math.floor(timeUsed / 60);
  const seconds = timeUsed % 60;
  
  // 格式化时间显示
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  document.getElementById('timer').textContent = `${formattedMinutes}:${formattedSeconds}`;
}

// 保存历史状态（用于撤销）
function saveHistory() {
  // 保存当前状态的深拷贝
  gameState.history.push({
    cupValues: [...gameState.cupValues],
    steps: [...gameState.steps]
  });
}

// 撤销上一步
function undoStep() {
  if (gameState.history.length === 0) return;
  
  // 恢复上一个状态
  const lastState = gameState.history.pop();
  gameState.cupValues = lastState.cupValues;
  gameState.steps = lastState.steps;
  
  // 更新显示
  updateDisplay();
}

// 显示提示
function showHint() {
  // 根据当前状态生成提示
  let hintText = '';
  
  if (gameState.steps.length === 0) {
    // 第一步提示
    hintText = `首先尝试装满${gameState.cupMaxValues[0]}升杯`;
  } else {
    // 根据当前水量状态提供提示
    const cup1 = gameState.cupValues[0];
    const cup2 = gameState.cupValues[1];
    const max1 = gameState.cupMaxValues[0];
    const max2 = gameState.cupMaxValues[1];
    
    if (cup1 === 0 && cup2 === 0) {
      hintText = `装满${max1}升杯`;
    } else if (cup1 === max1 && cup2 === 0) {
      hintText = `将${max1}升杯倒入${max2}升杯`;
    } else if (cup1 > 0 && cup2 === max2) {
      hintText = `倒空${max2}升杯`;
    } else {
      hintText = `尝试在两个杯子之间倒水`;
    }
  }
  
  // 显示提示
  document.getElementById('hint-text').textContent = hintText;
  const modal = document.getElementById('hint-modal');
  modal.style.display = 'flex';
  
  // 添加动画效果
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// 关闭提示对话框
function closeHintModal() {
  const modal = document.getElementById('hint-modal');
  modal.classList.remove('show');
  
  // 添加消失动画
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// 应用提示
function applyHint() {
  // 获取提示文本
  const hintText = document.getElementById('hint-text').textContent;
  
  // 根据提示执行操作
  if (hintText.includes('装满')) {
    if (hintText.includes(gameState.cupMaxValues[0])) {
      fillCup(0);
    } else {
      fillCup(1);
    }
  } else if (hintText.includes('倒空')) {
    if (hintText.includes(gameState.cupMaxValues[0])) {
      pourCup(0);
    } else {
      pourCup(1);
    }
  } else if (hintText.includes('倒入')) {
    if (hintText.includes(`${gameState.cupMaxValues[0]}升杯倒入`)) {
      pourToOther(0, 1);
    } else {
      pourToOther(1, 0);
    }
  }
  
  // 关闭提示对话框
  closeHintModal();
}

// 装满水杯操作
function fillCup(cup) {
  console.log('执行fillCup函数, cup =', cup);
  
  // 检查游戏状态是否已初始化
  if (!gameState || !gameState.cupMaxValues) {
    console.error('游戏状态未初始化，无法执行fillCup');
    return;
  }
  
  // 确保有效的杯子下标
  if (cup < 0 || cup >= gameState.cupMaxValues.length) {
    console.error('无效的杯子下标:', cup);
    return;
  }
  
  const maxValue = gameState.cupMaxValues[cup];
  
  // 如果杯子没满，可以装满
  if (gameState.cupValues[cup] < maxValue) {
    saveHistory();
    
    gameState.cupValues[cup] = maxValue;
    gameState.steps.push(`装满${maxValue}升杯`);
    
    // 播放倒水音效
    playPourSound('fill');
    
    // 创建装水动画
    createFillAnimation(cup);
    
    updateDisplay();
  }
}

// 倒空水杯操作
function pourCup(cup) {
  console.log('执行pourCup函数, cup =', cup);
  
  // 检查游戏状态是否已初始化
  if (!gameState || !gameState.cupMaxValues) {
    console.error('游戏状态未初始化，无法执行pourCup');
    return;
  }
  
  // 确保有效的杯子下标
  if (cup < 0 || cup >= gameState.cupMaxValues.length) {
    console.error('无效的杯子下标:', cup);
    return;
  }
  
  const maxValue = gameState.cupMaxValues[cup];
  
  // 如果杯子有水，可以倒空
  if (gameState.cupValues[cup] > 0) {
    saveHistory();
    
    gameState.cupValues[cup] = 0;
    gameState.steps.push(`倒空${maxValue}升杯`);
    
    // 播放倒水音效
    playPourSound('empty');
    
    // 创建倒水动画
    createPourAnimation(cup, -1);
    
    updateDisplay();
  }
}

// 杯子间倒水操作
function pourToOther(from, to) {
  console.log('执行pourToOther函数, from =', from, ', to =', to);
  
  // 检查游戏状态是否已初始化
  if (!gameState || !gameState.cupMaxValues) {
    console.error('游戏状态未初始化，无法执行pourToOther');
    return;
  }
  
  // 确保有效的杯子下标
  if (from < 0 || from >= gameState.cupMaxValues.length || 
      to < 0 || to >= gameState.cupMaxValues.length) {
    console.error('无效的杯子下标:', from, to);
    return;
  }
  
  const fromVol = gameState.cupValues[from];
  const toVol = gameState.cupValues[to];
  const toMax = gameState.cupMaxValues[to];
  const fromMax = gameState.cupMaxValues[from];
  
  // 计算可倒水量
  const moveVol = Math.min(fromVol, toMax - toVol);
  
  if (moveVol > 0) {
    saveHistory();
    
    // 更新水量
    gameState.cupValues[from] -= moveVol;
    gameState.cupValues[to] += moveVol;
    
    // 记录步骤
    gameState.steps.push(`${fromMax}升杯倒入${toMax}升杯`);
    
    // 播放音效和动画
    playPourSound('transfer');
    
    // 创建倒水动画
    createPourAnimation(from, to);
    
    updateDisplay();
  }
}

// 创建装水动画
function createFillAnimation(cup) {
  const cupElement = document.getElementById(cup === 0 ? 'cup-5' : 'cup-3');
  
  // 创建水滴元素
  for (let i = 0; i < 10; i++) {
    const drop = document.createElement('div');
    drop.className = 'water-drop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
    
    cupElement.appendChild(drop);
    
    // 动画结束后移除水滴
    setTimeout(() => {
      if (drop.parentNode) {
        drop.parentNode.removeChild(drop);
      }
    }, 1000);
  }
}

// 创建倒水动画
function createPourAnimation(from, to) {
  const fromCup = document.getElementById(from === 0 ? 'cup-5' : 'cup-3');
  
  // 创建水流粒子
  const particles = 25;
  
  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    particle.className = 'water-particle';
    
    // 设置起始位置
    particle.style.left = `${fromCup.offsetLeft + fromCup.offsetWidth / 2}px`;
    particle.style.top = `${fromCup.offsetTop + fromCup.offsetHeight / 2}px`;
    
    // 如果是倒入另一个杯子
    if (to >= 0) {
      const toCup = document.getElementById(to === 0 ? 'cup-5' : 'cup-3');
      
      // 设置目标位置
      const targetX = toCup.offsetLeft + toCup.offsetWidth / 2;
      const targetY = toCup.offsetTop;
      
      // 设置动画
      particle.style.animation = `pour ${0.5 + Math.random() * 0.5}s forwards`;
      particle.style.setProperty('--target-x', `${targetX - particle.offsetLeft}px`);
      particle.style.setProperty('--target-y', `${targetY - particle.offsetTop}px`);
      
      // 到达目标时创建水花
      setTimeout(() => {
        createWaterSplash(targetX, targetY);
      }, 500 * Math.random());
    } else {
      // 倒空的情况
      particle.style.animation = `pour-out ${0.5 + Math.random() * 0.5}s forwards`;
    }
    
    document.body.appendChild(particle);
    
    // 动画结束后移除粒子
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1000);
  }
}

// 创建水花效果
function createWaterSplash(x, y) {
  const splashCount = 8;
  
  for (let i = 0; i < splashCount; i++) {
    const splash = document.createElement('div');
    splash.className = 'water-splash';
    
    // 设置起始位置
    splash.style.left = `${x}px`;
    splash.style.top = `${y}px`;
    
    // 计算随机方向
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    const splashX = Math.cos(angle) * distance;
    const splashY = Math.sin(angle) * distance;
    
    // 设置动画
    splash.style.animation = `splash ${0.3 + Math.random() * 0.3}s forwards`;
    splash.style.setProperty('--splash-x', `${splashX}px`);
    splash.style.setProperty('--splash-y', `${splashY}px`);
    
    document.body.appendChild(splash);
    
    // 动画结束后移除
    setTimeout(() => {
      if (splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 600);
  }
}

// 绑定所有按钮事件
function bindAllButtonEvents() {
  console.log('绑定所有按钮事件...');
  
  // 操作按钮
  safeAddEventListener('btn-fill-5', 'click', function() {
    console.log('点击：装满大杯');
    fillCup(0);
  });
  
  safeAddEventListener('btn-fill-3', 'click', function() {
    console.log('点击：装满小杯');
    fillCup(1);
  });
  
  safeAddEventListener('btn-pour-5', 'click', function() {
    console.log('点击：倒空大杯');
    pourCup(0);
  });
  
  safeAddEventListener('btn-pour-3', 'click', function() {
    console.log('点击：倒空小杯');
    pourCup(1);
  });
  
  safeAddEventListener('btn-5to3', 'click', function() {
    console.log('点击：大杯倒入小杯');
    pourToOther(0, 1);
  });
  
  safeAddEventListener('btn-3to5', 'click', function() {
    console.log('点击：小杯倒入大杯');
    pourToOther(1, 0);
  });
  
  // 控制按钮
  safeAddEventListener('btn-undo', 'click', function() {
    console.log('点击：后退一步');
    undoStep();
  });
  
  safeAddEventListener('btn-reset', 'click', function() {
    console.log('点击：重新开始');
    resetGame();
  });
  
  safeAddEventListener('btn-hint', 'click', function() {
    console.log('点击：提示');
    showHint();
  });
  
  // 关卡选择按钮
  safeAddEventListener('level-selector-btn', 'click', function() {
    console.log('点击：切换关卡');
    const modal = document.getElementById('level-selector-modal');
    modal.style.display = 'flex';
    
    // 添加动画效果
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  });
  
  // 使用事件委托处理关卡选择
  const levelSelector = document.getElementById('level-selector-content');
  if (levelSelector) {
    levelSelector.addEventListener('click', function(e) {
      // 查找被点击的关卡按钮
      const levelButton = e.target.closest('.level-button');
      if (!levelButton) return;
      
      // 检查是否已解锁
      if (levelButton.classList.contains('unlocked')) {
        const levelId = parseInt(levelButton.dataset.levelId);
        console.log('选择关卡:', levelId);
        loadLevel(levelId);
        document.getElementById('level-selector-modal').style.display = 'none';
      }
    });
  }
  
  // 提示对话框按钮
  safeAddEventListener('close-hint', 'click', function() {
    console.log('点击：关闭提示');
    closeHintModal();
  });
  
  safeAddEventListener('close-hint-btn', 'click', function() {
    console.log('点击：关闭提示按钮');
    closeHintModal();
  });
  
  safeAddEventListener('apply-hint-btn', 'click', function() {
    console.log('点击：应用提示');
    applyHint();
  });
  
  // 结果对话框按钮
  safeAddEventListener('close-result', 'click', function() {
    console.log('点击：关闭结果');
    const modal = document.getElementById('result-modal');
    modal.classList.remove('show');
    
    // 添加消失动画
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  });
  
  safeAddEventListener('next-level', 'click', function() {
    console.log('点击：下一关');
    const nextLevelId = currentLevelData.id + 1;
    const modal = document.getElementById('result-modal');
    
    modal.classList.remove('show');
    
    // 添加消失动画
    setTimeout(() => {
      modal.style.display = 'none';
      if (nextLevelId <= levels.length) {
        loadLevel(nextLevelId);
      }
    }, 300);
  });
  
  // 关闭模态框按钮
  safeAddEventListener('close-level-selector', 'click', function() {
    console.log('点击：关闭关卡选择器');
    const modal = document.getElementById('level-selector-modal');
    modal.classList.remove('show');
    
    // 添加消失动画
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  });
  
  console.log('所有按钮事件绑定完成');
}

// 安全地添加事件监听器（防止元素不存在导致的错误）
function safeAddEventListener(elementId, eventType, handler) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener(eventType, handler);
  } else {
    console.warn(`元素 #${elementId} 不存在，无法绑定 ${eventType} 事件`);
  }
}

// 初始化触摸事件
function initTouchEvents() {
  // 添加水杯的触摸事件
  const cup5 = document.getElementById('cup-5');
  const cup3 = document.getElementById('cup-3');
  
  if (cup5) {
    cup5.addEventListener('touchstart', handleCupTouch, { passive: true });
  }
  
  if (cup3) {
    cup3.addEventListener('touchstart', handleCupTouch, { passive: true });
  }
  
  // 防止双击缩放
  document.addEventListener('dblclick', function(e) {
    e.preventDefault();
  });
  
  // 添加触摸反馈
  const allButtons = document.querySelectorAll('.buttons button, .control-buttons button');
  allButtons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.classList.add('active');
    }, { passive: true });
    
    button.addEventListener('touchend', function() {
      this.classList.remove('active');
    }, { passive: true });
  });
}

// 处理水杯的触摸事件
function handleCupTouch(e) {
  const cup = e.currentTarget;
  const cupId = cup.id;
  const isLargeCup = cupId === 'cup-5';
  const cupIndex = isLargeCup ? 0 : 1;
  
  // 显示操作菜单
  showCupActionMenu(cup, cupIndex);
}

// 显示水杯操作菜单
function showCupActionMenu(cup, cupIndex) {
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.cup-action-menu');
  if (existingMenu) {
    document.body.removeChild(existingMenu);
  }
  
  // 创建新菜单
  const menu = document.createElement('div');
  menu.className = 'cup-action-menu';
  
  // 获取水杯位置
  const rect = cup.getBoundingClientRect();
  
  // 设置菜单样式
  menu.style.position = 'absolute';
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 10}px`;
  menu.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
  menu.style.padding = '10px';
  menu.style.zIndex = '1000';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.gap = '8px';
  
  // 添加操作按钮
  const actions = [
    { text: `装满${gameState.cupMaxValues[cupIndex]}升杯`, action: () => fillCup(cupIndex) },
    { text: `倒空${gameState.cupMaxValues[cupIndex]}升杯`, action: () => pourCup(cupIndex) },
    { text: cupIndex === 0 ? `倒入${gameState.cupMaxValues[1]}升杯` : `倒入${gameState.cupMaxValues[0]}升杯`, action: () => pourToOther(cupIndex, 1 - cupIndex) }
  ];
  
  actions.forEach(action => {
    const button = document.createElement('button');
    button.textContent = action.text;
    button.style.padding = '10px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.backgroundColor = '#2196f3';
    button.style.color = 'white';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
      action.action();
      document.body.removeChild(menu);
    });
    
    menu.appendChild(button);
  });
  
  // 添加关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '取消';
  closeButton.style.padding = '10px';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '5px';
  closeButton.style.backgroundColor = '#e0e0e0';
  closeButton.style.color = '#333';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.cursor = 'pointer';
  closeButton.style.marginTop = '5px';
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(menu);
  });
  
  menu.appendChild(closeButton);
  
  // 添加到文档
  document.body.appendChild(menu);
  
  // 点击其他地方关闭菜单
  const closeMenuOnClick = (e) => {
    if (!menu.contains(e.target) && !cup.contains(e.target)) {
      document.body.removeChild(menu);
      document.removeEventListener('click', closeMenuOnClick);
    }
  };
  
  // 使用延迟添加事件，避免立即触发
  setTimeout(() => {
    document.addEventListener('click', closeMenuOnClick);
  }, 100);
}

// 为移动设备优化
function optimizeForMobileDevices() {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // 添加移动设备特定的类
    document.body.classList.add('mobile-device');
    
    // 防止页面缩放
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 添加触摸反馈
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.97)';
      }, { passive: true });
      
      button.addEventListener('touchend', function() {
        this.style.transform = 'scale(1)';
      }, { passive: true });
    });
    
    // 优化模态框大小
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(content => {
      content.style.maxHeight = '80vh';
      content.style.overflowY = 'auto';
      content.style.WebkitOverflowScrolling = 'touch'; // 平滑滚动
    });
  }
}

// 添加移动设备特定的CSS
function addMobileStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .cup-action-menu {
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .mobile-device .buttons button:active,
    .mobile-device .control-buttons button:active {
      transform: scale(0.97);
      background: linear-gradient(to bottom, #0288d1, #0277bd);
    }
    
    .mobile-device .cup:active {
      transform: scale(0.98);
    }
    
    /* 增强触摸反馈 */
    .mobile-device .buttons button,
    .mobile-device .control-buttons button {
      transition: transform 0.1s, background-color 0.1s;
    }
  `;
  
  document.head.appendChild(style);
}

// 在页面加载时添加移动样式
addMobileStyles();

// 导出游戏状态和函数，方便调试
window.gameState = gameState;
window.fillCup = fillCup;
window.pourCup = pourCup;
window.pourToOther = pourToOther;
window.resetGame = resetGame;
