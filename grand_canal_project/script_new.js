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
var map = null;
var marker = null;
var path = null;
var animationTimer = null;
var currentInfoWindow = null;
var isAnimating = false;
var currentIndex = 0;

// 初始化地图
function initMap() {
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
    
    // 调整初始视野
    fitMapBounds();
    
    console.log('地图初始化完成');
    
    // 初始化后绑定事件
    bindControls();
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
    var duration = 2000; // 2秒
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
        marker.setAngle(angle + 45);
        
        // 更新地图视野
        var bounds = new AMap.Bounds([currentPoint, nextPos]);
        map.setBounds(bounds, true, [50, 50, 50, 50]);
        
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，准备初始化地图');
    
    // 在尝试加载地图前添加延时，确保所有DOM元素已准备好
    setTimeout(function() {
        if (typeof AMap !== 'undefined') {
            console.log('AMap已加载，初始化地图');
            initMap();
        } else {
            console.error('AMap未加载，无法初始化地图');
            // 尝试重新加载
            var checkAMap = setInterval(function() {
                if (typeof AMap !== 'undefined') {
                    clearInterval(checkAMap);
                    initMap();
                }
            }, 200);
        }
    }, 500);
});
