// 运河路线点位 - 增加更多详细点位使路线更平滑
var canalPoints = [
    { name: '杭州', coords: [120.2, 30.3], description: '起点，南宋都城', history: '京杭大运河南端起点，南宋时期的都城，素有"人间天堂"之称。' },
    { name: '嘉兴', coords: [120.76, 30.75], description: '江南水乡', history: '因河成市，因运而兴，是江南著名的水乡古城。' },
    { name: '湖州', coords: [120.1, 30.9], description: '丝绸之源', history: '中国丝绸的重要产地，也是茶叶集散地。' },
    { name: '苏州', coords: [120.6, 31.3], description: '丝绸之府，园林之城', history: '有"人间天堂"、"东方威尼斯"之称，是中国园林艺术的代表城市。' },
    { name: '无锡', coords: [120.3, 31.57], description: '太湖明珠', history: '因运河而兴，古代为丝绸和瓷器的重要集散地。' },
    { name: '常州', coords: [119.95, 31.79], description: '运河古城', history: '运河沿线的重要城市，有"龙城"之称。' },
    { name: '镇江', coords: [119.45, 32.2], description: '江河交汇处', history: '长江与大运河的交汇处，自古为兵家必争之地。' },
    { name: '扬州', coords: [119.4, 32.4], description: '运河名城，盐业重镇', history: '唐宋时期的经济文化中心，素有"淮左名都"之称。' },
    { name: '淮安', coords: [119.1, 33.5], description: '漕运枢纽', history: '古称"清河"，是大运河与淮河的交汇处，历史上的漕运枢纽。' },
    { name: '宿迁', coords: [118.3, 33.96], description: '运河新城', history: '古代为漕运重镇，今日为新兴城市。' },
    { name: '枣庄', coords: [117.57, 34.86], description: '运河煤城', history: '古代为漕运重要站点，近代因煤矿而兴。' },
    { name: '济宁', coords: [116.6, 35.4], description: '孔孟之乡', history: '儒家文化发源地，孔子、孟子的故乡。' },
    { name: '聊城', coords: [115.98, 36.45], description: '水城', history: '因运河而兴，有"江北水城"之称。' },
    { name: '德州', coords: [116.3, 37.45], description: '九达天衢', history: '古代为南北交通要道，运河上的重要节点。' },
    { name: '沧州', coords: [116.85, 38.3], description: '铁狮子城', history: '因运河而兴，历史上为重要的军事要塞。' },
    { name: '天津', coords: [117.2, 39.1], description: '北方港口', history: '大运河的重要港口城市，清代为漕运终点。' },
    { name: '北京', coords: [116.4, 39.9], description: '终点，历代都城', history: '大运河的北端终点，元、明、清三代的都城。' }
];

// 全局变量
var map = null;
var mainBoat = null;
var path = null;
var boatMarkers = [];
var rippleMarkers = [];
var currentInfoWindow = null;
var isAnimating = false;
var currentIndex = 0;
var boatAnimation = null;
var boatAnimationPaused = false;
var boatAnimationProgress = 0;
var animationSpeed = 30000; // 动画总时长，单位毫秒

// 城市坐标数据 - 主要城市
const cityPoints = [
    { name: '北京', coords: [116.4, 39.9], description: '终点，历代都城' },
    { name: '天津', coords: [117.2, 39.1], description: '北方港口' },
    { name: '济宁', coords: [116.6, 35.4], description: '孔孟之乡' },
    { name: '扬州', coords: [119.4, 32.4], description: '运河名城，盐业重镇' },
    { name: '苏州', coords: [120.6, 31.3], description: '丝绸之府，园林之城' },
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
            showLabel: false,
            viewMode: '3D'  // 使用3D视图增强效果
        });
        
        // 创建路线
        var pathCoords = [];
        for (var i = 0; i < canalPoints.length; i++) {
            pathCoords.push(canalPoints[i].coords);
        }
        
        // 主路径 - 宽线
        path = new AMap.Polyline({
            path: pathCoords,
            strokeColor: '#1e4d6b',
            strokeWeight: 6,
            strokeOpacity: 0.8,
            zIndex: 50,
            strokeStyle: 'solid',
            strokeDasharray: [0, 0]
        });
        path.setMap(map);
        
        // 装饰路径 - 发光效果
        var glowPath = new AMap.Polyline({
            path: pathCoords,
            strokeColor: '#4fc3f7',
            strokeWeight: 10,
            strokeOpacity: 0.2,
            zIndex: 40,
            strokeStyle: 'solid'
        });
        glowPath.setMap(map);
        
        // 创建主船只标记
        createMainBoat(pathCoords[0]);
        
        // 创建装饰性船只
        createDecorativeBoats(pathCoords[0]);
        
        // 添加站点标记
        addCityMarkers();
        
        // 调整初始视野
        fitMapBounds();
        
        console.log('地图初始化完成');
        
        // 添加地图控件
        map.plugin(['AMap.ToolBar', 'AMap.Scale'], function() {
            map.addControl(new AMap.ToolBar({
                position: 'RB'
            }));
            map.addControl(new AMap.Scale());
        });
        
    } catch (e) {
        console.error('地图初始化失败:', e);
        var mapContainer = document.getElementById('canal-map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="padding: 20px; text-align: center;">' +
                                    '<h3>地图加载失败</h3>' +
                                    '<p>错误信息: ' + e.message + '</p>' +
                                    '<button onclick="location.reload()" style="padding: 5px 10px;">刷新页面</button>' +
                                    '</div>';
        }
    }
}

// 创建主船只标记
function createMainBoat(initialPosition) {
    // 创建自定义船只图标
    var boatIcon = document.createElement('div');
    boatIcon.className = 'boat-icon';
    boatIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 100 100">
            <use href="#boat-icon"/>
        </svg>
        <div class="boat-shadow"></div>
    `;
    
    // 创建船只标记
    mainBoat = new AMap.Marker({
        position: initialPosition,
        content: boatIcon,
        offset: new AMap.Pixel(-16, -16),
        zIndex: 110,
        angle: 45
    });
    
    mainBoat.setMap(map);
    boatMarkers.push(mainBoat);
    
    return mainBoat;
}

// 创建装饰性船只
function createDecorativeBoats(initialPosition) {
    // 创建2-3艘小船，跟随在主船周围
    for (let i = 0; i < 3; i++) {
        const smallBoatIcon = document.createElement('div');
        smallBoatIcon.className = 'small-boat-icon';
        smallBoatIcon.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 100 100">
                <use href="#boat-icon"/>
            </svg>
        `;
        
        // 计算小船的初始位置偏移
        const offsetX = (i % 2 === 0) ? -15 : 15;
        const offsetY = -10 - (i * 5);
        
        const smallBoat = new AMap.Marker({
            position: initialPosition,
            content: smallBoatIcon,
            offset: new AMap.Pixel(-8 + offsetX, -8 + offsetY),
            zIndex: 100,
            angle: 45 + (i * 10 - 15) // 稍微不同的角度
        });
        
        smallBoat.setMap(map);
        boatMarkers.push(smallBoat);
    }
}

// 添加城市标记
function addCityMarkers() {
    // 添加站点标记
    for (var i = 0; i < canalPoints.length; i++) {
        var point = canalPoints[i];
        
        // 创建标记
        var marker = new AMap.Marker({
            map: map,
            position: point.coords,
            title: point.name,
            label: {
                content: point.name,
                direction: 'top'
            }
        });
        
        // 添加点击事件
        (function(city) {
            marker.on('click', function() {
                showCityInfoOverlay(city);
            });
        })(point);
    }
    
    // 添加主要城市标记 - 更突出的样式
    cityPoints.forEach(point => {
        const cityMarker = document.createElement('div');
        cityMarker.className = 'city-marker';
        cityMarker.innerHTML = `
            <span class="city-name">${point.name}</span>
            <div class="marker-dot"></div>
        `;
        
        new AMap.Marker({
            position: point.coords,
            title: point.name,
            map: map,
            content: cityMarker,
            zIndex: 90
        });
    });
}

// 绑定控制按钮事件
function bindControls() {
    // 绑定运河动画控制按钮
    const btnPlay = document.getElementById('boatPlay');
    const btnPause = document.getElementById('boatPause');
    const btnReset = document.getElementById('boatReset');
    
    if (btnPlay) {
        btnPlay.onclick = function() {
            startBoatAnimation();
            this.classList.add('active');
            if (btnPause) btnPause.classList.remove('active');
        };
    }
    
    if (btnPause) {
        btnPause.onclick = function() {
            pauseBoatAnimation();
            this.classList.add('active');
            if (btnPlay) btnPlay.classList.remove('active');
        };
    }
    
    if (btnReset) {
        btnReset.onclick = function() {
            resetBoatAnimation();
            if (btnPlay) btnPlay.classList.remove('active');
            if (btnPause) btnPause.classList.remove('active');
        };
    }
}

// 创建水波纹效果
function createWaterRippleEffect(position) {
    // 清除现有的水波纹
    rippleMarkers.forEach(marker => {
        marker.setMap(null);
    });
    rippleMarkers = [];
    
    const rippleIcon = document.createElement('div');
    rippleIcon.className = 'water-ripple';
    
    const rippleMarker = new AMap.Marker({
        position: position,
        content: rippleIcon,
        offset: new AMap.Pixel(-20, -20),
        zIndex: 90
    });
    
    rippleMarker.setMap(map);
    rippleMarkers.push(rippleMarker);
    
    // 2秒后自动移除
    setTimeout(() => {
        rippleMarker.setMap(null);
        const index = rippleMarkers.indexOf(rippleMarker);
        if (index > -1) {
            rippleMarkers.splice(index, 1);
        }
    }, 2000);
}

// 添加动画开始的视觉效果
function addAnimationStartEffect() {
    if (mainBoat) {
        const position = mainBoat.getPosition();
        
        const startRippleIcon = document.createElement('div');
        startRippleIcon.className = 'start-ripple';
        
        const startRipple = new AMap.Marker({
            position: position,
            content: startRippleIcon,
            offset: new AMap.Pixel(-50, -50),
            zIndex: 85
        });
        
        startRipple.setMap(map);
        
        // 动画结束后移除
        setTimeout(() => {
            startRipple.setMap(null);
        }, 2000);
    }
}

// 初始化船只动画
function initBoatAnimation() {
    // 重置所有船只位置
    if (boatMarkers.length > 0) {
        const startPosition = canalPoints[0].coords;
        boatMarkers.forEach(boat => {
            boat.setPosition(startPosition);
        });
    }
    
    // 重置进度条
    const progressBar = document.getElementById('boatProgress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

// 移动船只标记
function moveBoatMarker(progress) {
    if (!map || !path) return;
    
    // 更新进度条
    const progressBar = document.getElementById('boatProgress');
    if (progressBar) {
        progressBar.style.width = (progress * 100) + '%';
    }
    
    // 获取路径上的点
    const pathList = path.getPath();
    if (pathList.length === 0) return;
    
    // 计算当前位置
    const totalLength = pathList.length - 1;
    const currentPointIndex = Math.min(totalLength, Math.floor(progress * totalLength));
    const nextPointIndex = Math.min(totalLength, currentPointIndex + 1);
    
    // 计算两点之间的插值
    const subProgress = (progress * totalLength) - currentPointIndex;
    const currentPoint = pathList[currentPointIndex];
    const nextPoint = pathList[nextPointIndex];
    
    // 线性插值计算当前位置
    const currentLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * subProgress;
    const currentLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * subProgress;
    const currentPosition = [currentLng, currentLat];
    
    // 计算船只朝向角度
    const angle = calculateAngle(currentPoint, nextPoint);
    
    // 更新主船只位置和角度
    if (mainBoat) {
        mainBoat.setPosition(currentPosition);
        mainBoat.setAngle(angle);
    }
    
    // 更新装饰性船只
    for (let i = 1; i < boatMarkers.length; i++) {
        const boat = boatMarkers[i];
        // 计算跟随偏移
        const offsetX = (i % 2 === 0) ? -15 : 15;
        const offsetY = -10 - (i * 5);
        
        // 根据主船方向调整偏移
        const rad = angle * Math.PI / 180;
        const rotatedOffsetX = offsetX * Math.cos(rad) - offsetY * Math.sin(rad);
        const rotatedOffsetY = offsetX * Math.sin(rad) + offsetY * Math.cos(rad);
        
        // 计算小船位置
        const boatLng = currentLng + rotatedOffsetX * 0.0001;
        const boatLat = currentLat + rotatedOffsetY * 0.0001;
        
        boat.setPosition([boatLng, boatLat]);
        boat.setAngle(angle + (i * 5 - 10)); // 稍微不同的角度
    }
    
    // 每隔一段距离创建水波纹效果
    if (Math.random() < 0.02) { // 随机创建，平均每50帧一次
        createWaterRippleEffect(currentPosition);
    }
    
    // 更新当前经过的城市信息
    updateCityInfo(progress);
}

// 更新当前经过的城市信息
function updateCityInfo(progress) {
    // 根据进度确定当前所在城市段
    const totalCities = canalPoints.length;
    const currentCityIndex = Math.min(totalCities - 1, Math.floor(progress * totalCities));
    
    if (currentCityIndex !== currentIndex) {
        currentIndex = currentCityIndex;
        const currentCity = canalPoints[currentCityIndex];
        
        // 显示城市信息
        showCityInfoOverlay(currentCity);
    }
}

// 显示城市信息浮层
function showCityInfoOverlay(city) {
    // 关闭现有信息窗口
    if (currentInfoWindow) {
        currentInfoWindow.close();
    }
    
    // 创建信息窗口内容
    const content = `
        <div class="city-info-window">
            <h3>${city.name}</h3>
            <p class="city-description">${city.description}</p>
            <div class="city-history">${city.history || ''}</div>
        </div>
    `;
    
    // 创建信息窗口
    currentInfoWindow = new AMap.InfoWindow({
        content: content,
        offset: new AMap.Pixel(0, -30),
        closeWhenClickMap: false
    });
    
    // 在城市位置打开信息窗口
    currentInfoWindow.open(map, city.coords);
}

// 计算角度
function calculateAngle(start, end) {
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return angle;
}

// 调整地图视野
function fitMapBounds() {
    if (!map || !path) return;
    
    const bounds = path.getBounds();
    map.setBounds(bounds, {
        padding: [50, 50, 50, 50]
    });
}

// 开始船只动画
function startBoatAnimation() {
    if (boatAnimationPaused) {
        boatAnimationPaused = false;
        resumeBoatAnimation();
        return;
    }
    
    // 防止多次启动动画
    if (boatAnimation) {
        cancelAnimationFrame(boatAnimation);
    }
    
    let startTime = null;
    
    function animate(ts) {
        if (boatAnimationPaused) return;
        
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        
        // 计算进度 (0-1)，使用可配置的动画时长
        boatAnimationProgress = Math.min(1, elapsed / animationSpeed);
        
        // 使用缓动函数使动画更自然
        const easedProgress = easeInOutSine(boatAnimationProgress);
        
        moveBoatMarker(easedProgress);
        
        if (boatAnimationProgress < 1) {
            boatAnimation = requestAnimationFrame(animate);
        } else {
            // 动画结束，可选择循环或停止
            setTimeout(() => {
                // 短暂暂停后重新开始
                boatAnimationProgress = 0;
                initBoatAnimation();
                startBoatAnimation();
            }, 2000); // 2秒后重新开始
        }
    }
    
    // 添加动画开始的视觉效果
    addAnimationStartEffect();
    
    // 开始动画
    boatAnimation = requestAnimationFrame(animate);
}

// 暂停船只动画
function pauseBoatAnimation() {
    boatAnimationPaused = true;
    if (boatAnimation) {
        cancelAnimationFrame(boatAnimation);
        boatAnimation = null;
    }
}

// 恢复船只动画
function resumeBoatAnimation() {
    if (!boatAnimationPaused) return;
    boatAnimationPaused = false;
    startBoatAnimation();
}

// 重置船只动画
function resetBoatAnimation() {
    pauseBoatAnimation();
    boatAnimationProgress = 0;
    initBoatAnimation();
    
    // 重置当前信息窗口
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
    
    // 重置当前城市索引
    currentIndex = 0;
}

// 缓动函数，使动画更自然
function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

// 音频播放控制
function initAudioPlayer() {
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
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        } else {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
        }
    }
    
    function updateProgress() {
        var percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = percent + '%';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查地图容器是否存在
    var mapContainer = document.getElementById('canal-map');
    if (!mapContainer) {
        console.error('找不到地图容器元素');
        return;
    }
    
    // 先检查 AMap 是否已加载
    if (typeof AMap !== 'undefined') {
        console.log('AMap已加载，直接初始化地图');
        setTimeout(() => {
            initMap();
            bindControls();
            initBoatAnimation();
            initAudioPlayer();
        }, 100); // 稍微延时确保地图 API 完全加载
        return;
    }
    
    console.log('等待AMap加载...');
    
    // 尝试手动加载高德地图 API
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=e8697e03ea2b09507f5b53afb8293420';
    script.onload = function() {
        console.log('AMap手动加载成功');
        setTimeout(() => {
            initMap();
            bindControls();
            initBoatAnimation();
            initAudioPlayer();
        }, 100);
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
});
