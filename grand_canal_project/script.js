// 运河路线点位
var canalPoints = [
    { name: '杭州', coords: [120.2, 30.3], description: '起点，南宋都城' },
    { name: '苏州', coords: [120.6, 31.3], description: '丝绸之府，园林之城' },
    { name: '扬州', coords: [119.4, 32.4], description: '运河名城，盐业重镇' },
    { name: '淮安', coords: [119.1, 33.5], description: '漕运枢纽' },
    { name: '济宁', coords: [116.6, 35.4], description: '孔孟之乡' },
    { name: '天津', coords: [117.2, 39.1], description: '北方港口' },
    { name: '北京', coords: [116.4, 39.9], description: '终点，历代都城' }
];

// 全局变量
// <script src="https://cdn.bootcdn.net/ajax/libs/gsap/3.7.1/MotionPathPlugin.min.js"></script>// 检查GSAP是否已加载
if (typeof gsap !== 'undefined') {
    console.log('GSAP已正确加载');
    // 可以安全使用GSAP动画
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
} else {
    console.error('GSAP未正确加载');
}
var map = null;
var marker = null;
var path = null;
var animationTimer = null;
var currentInfoWindow = null;
var isAnimating = false;
var currentIndex = 0;

// 城市坐标数据
const cityPoints = [
    { name: '北京', coords: [116.4, 39.9], description: '终点，历代都城' },
    { name: '济宁', coords: [116.6, 35.4], description: '孔孟之乡' },
    { name: '扬州', coords: [119.4, 32.4], description: '运河名城，盐业重镇' },
    { name: '杭州', coords: [120.2, 30.3], description: '起点，南宋都城' }
];

// 初始化地图
function initMap() {
    try {
        console.log('开始初始化地图');
        // 检查地图容器是否存在
        var mapContainer = document.getElementById('canal-map');
        if (!mapContainer) {
            console.error('找不到地图容器元素');
            return;
        }
        
        // 创建地图实例
        map = new AMap.Map('canal-map', {
            zoom: 6,
            center: [118.5, 35],
            mapStyle: 'amap://styles/whitesmoke',
            pitch: 0,
            features: ['bg', 'road'],
            showLabel: false
        });
        
        // 创建路线
        var pathCoords = [];
        for (var i = 0; i < canalPoints.length; i++) {
            pathCoords.push(canalPoints[i].coords);
        }
        
        path = new AMap.Polyline({
            path: pathCoords,
            strokeColor: '#1e4d6b',
            strokeWeight: 6,
            strokeOpacity: 0.8
        });
        path.setMap(map);
        
        // 创建船只标记
        var boatIcon = document.createElement('div');
        boatIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 100 100">'+
                             '<use href="#boat-icon"/>'+
                             '</svg>';
        boatIcon.style.transform = 'rotate(-45deg)';
        
        marker = new AMap.Marker({
            position: pathCoords[0],
            content: boatIcon,
            offset: new AMap.Pixel(-10, -10),
            angle: 45
        });
        marker.setMap(map);
        
        // 添加站点标记
        for (var i = 0; i < canalPoints.length; i++) {
            var point = canalPoints[i];
            new AMap.Marker({
                map: map,
                position: point.coords,
                title: point.name,
                label: {
                    content: point.name,
                    direction: 'top'
                }
            });
        }
        
        // 添加城市标记
        cityPoints.forEach(point => {
            new AMap.Marker({
                position: point.coords,
                title: point.name,
                map: map,
                content: `
                    <div class="city-marker">
                        <span class="city-name">${point.name}</span>
                        <div class="marker-dot"></div>
                    </div>
                `
            });
        });
        
        // 调整初始视野
        fitMapBounds();
        
        console.log('地图初始化完成');
        
        // 初始化后绑定事件
        bindControls();
    } catch (error) {
        console.error('地图初始化错误:', error);
        var mapContainer = document.getElementById('canal-map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="padding: 20px; text-align: center;">' +
                                    '<h3>地图加载失败</h3>' +
                                    '<p>错误信息: ' + error.message + '</p>' +
                                    '<button onclick="location.reload()" style="padding: 5px 10px;">刷新页面</button>' +
                                    '</div>';
        }
    }
}

// 绑定控制按钮事件
function bindControls() {
    var startBtn = document.getElementById('startAnimation');
    var resetBtn = document.getElementById('resetAnimation');
    
    if (startBtn && resetBtn) {
        startBtn.onclick = function() {
            console.log('点击开始/暂停按钮');
            if (isAnimating) {
                pauseAnimation();
            } else {
                startAnimation();
            }
        };
        
        resetBtn.onclick = function() {
            console.log('点击重置按钮');
            resetAnimation();
        };
        
        console.log('按钮事件绑定完成');
    } else {
        console.error('未找到动画控制按钮');
    }
}

// 动画控制函数
function startAnimation() {
    console.log('开始动画');
    if (!map || !marker) {
        console.error('地图或标记未初始化');
        return;
    }
    
    isAnimating = true;
    animateToNextPoint();
    
    // 更新按钮状态
    var startBtn = document.getElementById('startAnimation');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停动画';
    }
}

function pauseAnimation() {
    console.log('暂停动画');
    isAnimating = false;
    
    if (animationTimer) {
        cancelAnimationFrame(animationTimer);
        animationTimer = null;
    }
    
    // 更新按钮状态
    var startBtn = document.getElementById('startAnimation');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-play"></i> 开始动画';
    }
}

function resetAnimation() {
    console.log('重置动画');
    pauseAnimation();
    currentIndex = 0;
    
    // 重置船只位置
    if (marker) {
        marker.setPosition(canalPoints[0].coords);
    }
    
    // 重置视野
    fitMapBounds();
    
    // 关闭信息窗口
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
}

function animateToNextPoint() {
    if (!isAnimating || currentIndex >= canalPoints.length - 1) {
        if (currentIndex >= canalPoints.length - 1) {
            resetAnimation();
        }
        return;
    }
    
    var currentPos = canalPoints[currentIndex].coords;
    var nextPos = canalPoints[currentIndex + 1].coords;
    var progress = 0;
    
    // 根据两点距离计算动画时间，使速度更均匀
    var distance = Math.sqrt(
        Math.pow(nextPos[0] - currentPos[0], 2) + 
        Math.pow(nextPos[1] - currentPos[1], 2)
    );
    var duration = 2000 * distance / 0.5; // 基准速度为每0.5度2000ms
    
    var startTime = performance.now();
    
    function animate(currentTime) {
        if (!isAnimating) return;
        
        progress = (currentTime - startTime) / duration;
        
        if (progress >= 1) {
            currentIndex++;
            showInfoWindow(currentIndex);
            animateToNextPoint();
            return;
        }
        
        // 计算当前位置
        var lng = currentPos[0] + (nextPos[0] - currentPos[0]) * progress;
        var lat = currentPos[1] + (nextPos[1] - currentPos[1]) * progress;
        var currentPoint = [lng, lat];
        
        // 更新船只位置和角度
        marker.setPosition(currentPoint);
        var angle = calculateAngle(currentPos, nextPos);
        marker.setAngle(angle); // 移除额外的45度偏移
        
        // 平滑更新地图视野
        var center = [
            (currentPos[0] + nextPos[0]) / 2,
            (currentPos[1] + nextPos[1]) / 2
        ];
        map.setCenter(center);
        
        animationTimer = requestAnimationFrame(animate);
    }
    
    animationTimer = requestAnimationFrame(animate);
}

function showInfoWindow(index) {
    if (currentInfoWindow) {
        currentInfoWindow.close();
    }
    
    var point = canalPoints[index];
    currentInfoWindow = new AMap.InfoWindow({
        content: '<div class="info-window" style="font-size: 12px;">'+
                 '<h3 style="margin: 0 0 4px 0;">'+point.name+'</h3>'+
                 '<p style="margin: 0;">'+point.description+'</p>'+
                 '</div>',
        offset: new AMap.Pixel(0, -20)
    });
    
    currentInfoWindow.open(map, point.coords);
}

function calculateAngle(start, end) {
    var dx = end[0] - start[0];
    var dy = end[1] - start[1];
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return angle;
}

function fitMapBounds() {
    if (map) {
        var bounds = new AMap.Bounds();
        for (var i = 0; i < canalPoints.length; i++) {
            bounds.extend(canalPoints[i].coords);
        }
        map.setBounds(bounds, true, [50, 50, 50, 50]);
    }
}

// 运河路径动画（船只Marker在地图Polyline上平滑移动）
let boatAnimation = null;
let boatAnimationPaused = false;
let boatAnimationProgress = 0;

function initBoatAnimation() {
    if (!marker || !path) return;
    // 清理上一次动画
    if (boatAnimation) {
        cancelAnimationFrame(boatAnimation);
        boatAnimation = null;
    }
    boatAnimationPaused = false;
    boatAnimationProgress = 0;
    moveBoatMarker(0);
}

function moveBoatMarker(progress) {
    // progress: 0 ~ 1
    const totalSegments = canalPoints.length - 1;
    const totalLength = totalSegments;
    let segFloat = progress * totalLength;
    let segIdx = Math.floor(segFloat);
    let segProgress = segFloat - segIdx;
    if (segIdx >= totalSegments) {
        segIdx = totalSegments - 1;
        segProgress = 1;
    }
    const start = canalPoints[segIdx].coords;
    const end = canalPoints[segIdx + 1].coords;
    const lng = start[0] + (end[0] - start[0]) * segProgress;
    const lat = start[1] + (end[1] - start[1]) * segProgress;
    marker.setPosition([lng, lat]);
    // 角度
    const angle = calculateAngle(start, end);
    marker.setAngle(angle);
    // 更新动画进度条
    const progressBar = document.getElementById('boatProgress');
    if (progressBar) {
        progressBar.style.width = (progress * 100) + '%';
    }
}

function startBoatAnimation() {
    let startTime = null;
    const duration = 12000; // 12秒一轮
    function animate(ts) {
        if (boatAnimationPaused) return;
        if (!startTime) startTime = ts - boatAnimationProgress * duration;
        let elapsed = ts - startTime;
        let progress = Math.min(elapsed / duration, 1);
        boatAnimationProgress = progress;
        moveBoatMarker(progress);
        if (progress < 1) {
            boatAnimation = requestAnimationFrame(animate);
        } else {
            // 动画结束，循环
            boatAnimationProgress = 0;
            initBoatAnimation();
            startBoatAnimation();
        }
    }
    boatAnimation = requestAnimationFrame(animate);
}

function pauseBoatAnimation() {
    boatAnimationPaused = true;
}

function resumeBoatAnimation() {
    if (!boatAnimationPaused) return;
    boatAnimationPaused = false;
    startBoatAnimation();
}

function resetBoatAnimation() {
    boatAnimationPaused = true;
    boatAnimationProgress = 0;
    moveBoatMarker(0);
    // 进度条归零
    const progressBar = document.getElementById('boatProgress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

// 可选：绑定按钮事件（需在HTML中有对应按钮）
// document.getElementById('playBtn').onclick = startBoatAnimation;
// document.getElementById('pauseBtn').onclick = pauseBoatAnimation;
// document.getElementById('resumeBtn').onclick = resumeBoatAnimation;
// document.getElementById('resetBtn').onclick = resetBoatAnimation;


// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initBoatAnimation();
    // 绑定运河动画控制按钮
    const btnPlay = document.getElementById('boatPlay');
    const btnPause = document.getElementById('boatPause');
    const btnReset = document.getElementById('boatReset');
    if (btnPlay) btnPlay.onclick = startBoatAnimation;
    if (btnPause) btnPause.onclick = pauseBoatAnimation;
    if (btnReset) btnReset.onclick = resetBoatAnimation;
});

// 音频播放控制
var audio = document.getElementById('bgMusic');
var playPauseBtn = document.getElementById('playPause');
var progress = document.getElementById('progress');
var volume = document.getElementById('volume');

if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlay);
}

if (audio) {
    audio.addEventListener('timeupdate', updateProgress);
    
    if (volume) {
        volume.addEventListener('input', function(e) {
            audio.volume = e.target.value;
        });
    }
}

function togglePlay() {
    if (audio.paused) {
        audio.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audio.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function updateProgress() {
    var percent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = percent + '%';
}

// 监听页面加载事件
window.onload = function() {
    console.log('页面加载完成，准备初始化地图');
    
    // 检查地图容器是否存在
    var mapContainer = document.getElementById('canal-map');
    if (!mapContainer) {
        console.error('找不到地图容器元素');
        return;
    }
    
    // 先检查 AMap 是否已加载
    if (typeof AMap !== 'undefined') {
        console.log('AMap已加载，直接初始化地图');
        setTimeout(initMap, 100); // 稍微延时确保地图 API 完全加载
        return;
    }
    
    console.log('等待AMap加载...');
    
    // 尝试手动加载高德地图 API
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=e8697e03ea2b09507f5b53afb8293420';
    script.onload = function() {
        console.log('AMap手动加载成功');
        setTimeout(initMap, 100);
    };
    script.onerror = function() {
        console.error('AMap手动加载失败');
        mapContainer.innerHTML = '<div style="padding: 20px; text-align: center;">' +
                                '<h3>地图加载失败</h3>' +
                                '<p>请检查网络连接后刷新页面</p>' +
                                '<button onclick="location.reload()" style="padding: 5px 10px;">刷新页面</button>' +
                                '</div>';
    };
    document.head.appendChild(script);
};
