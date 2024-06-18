document.addEventListener('DOMContentLoaded', function() {
    var rectangle;
    var rectangleCoordinates = [];
    var imageUrlList = [];
    // var rectangleCoordinate;
    var displayStates = {};
    var imageInfo = {};
    var selectedImages = {}
    var selectedLayers = {};

    // Инициализация карты
    var map = L.map('map', {
        center: [45, 70],
        zoom: 5,
        zoomControl: false
    });

    // Добавление OpenStreetMap слоя
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 12,
        minZoom: 4,
    }).addTo(map);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Добавление иконки местоположения
    var initialLatLng = [45, 70];
    var marker = L.marker(initialLatLng, { draggable: true }).addTo(map);

    updateCoordinates(initialLatLng[0], initialLatLng[1]);

    marker.on('drag', function (e) {
        var latlng = e.target.getLatLng();
        updateCoordinates(latlng.lat, latlng.lng);
        if (rectangle) {
            rectangle.remove();
        }
        createRectangle(latlng.lat, latlng.lng, map.getZoom());
    });

    map.on('zoomend', function() {
        var latlng = marker.getLatLng();
        createRectangle(latlng.lat, latlng.lng, map.getZoom());
    });

    function updateCoordinates(lat, lng) {
        document.getElementById('lat').value = lat.toFixed(3);
        document.getElementById('long').value = lng.toFixed(3);
    }

    function updateMarkerPosition(lat, lng) {
        var newLatLng = new L.LatLng(lat, lng);
        marker.setLatLng(newLatLng);
        map.setView(newLatLng);
        if (rectangle) {
            rectangle.remove();
        }
        createRectangle(lat, lng, map.getZoom());
    }

    // Обработчики событий для полей ввода
    document.getElementById('lat').addEventListener('input', function () {
        var lat = parseFloat(this.value);
        var lng = parseFloat(document.getElementById('long').value);
        updateMarkerPosition(lat, lng);
    });

    document.getElementById('long').addEventListener('input', function () {
        var lat = parseFloat(document.getElementById('lat').value);
        var lng = parseFloat(this.value);
        updateMarkerPosition(lat, lng);
    });

    function createCoordinates(coordinate, displayId, imageUrlList) {
        var coordinates = [
            [coordinate[0][1], coordinate[0][0]],
            [coordinate[1][1], coordinate[1][0]],
            [coordinate[2][1], coordinate[2][0]],
            [coordinate[3][1], coordinate[3][0]],
            [coordinate[4][1], coordinate[4][0]],
        ]; 
        var rectangleCoordinate = L.polygon(coordinates, { color: 'transparent', displayId: displayId, imageUrlList: imageUrlList, coordinates: coordinates }).addTo(map);
        rectangleCoordinates.push(rectangleCoordinate);
    }

    function createRectangle(lat, long, zoomLevel){
        if (rectangle) {
            map.removeLayer(rectangle);
        }

        var size = 1 / Math.pow(2, zoomLevel - 7);
        fetchDataSize(size);

        rectangle = L.rectangle([
            [lat - size/2, long - size],
            [lat + size/2, long + size]
        ], {color: "red", weight: 1}).addTo(map);
        
    }

    function sendCoordinates() {
        deleteLayer();
        deleteRectangle();
        deleteRectanleCoordinates();
        // deleteRectangle();

        var latlng = marker.getLatLng();
        var lat = latlng.lat.toFixed(5);
        var lng = latlng.lng.toFixed(5);
        var oldLoader = document.getElementById('loader');
        if (oldLoader) {
            oldLoader.remove();
        }
        var loader = document.createElement('div');
        loader.id = 'loader';
        loader.textContent = 'Loading...';
        loader.style.display = 'block';
        document.querySelector('.working-panel').appendChild(loader);
        fetchData(lat, lng);
        activateLink(document.getElementById('result'));
    }

    // Отправка данных на сервер
    function fetchData(lat, lng) {
        fetch('/maps/get_imagery/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                latitude: lat,
                longitude: lng,
            })
        })
        .then(response => response.json())
        .then(data => {
            var imagesDiv = document.getElementById('result-div-images');
            imagesDiv.innerHTML = '';

            for (var displayId in data.screenInfo) {
                if (displayId) {
                    var screenInfo = data.screenInfo[displayId];
                    var spatialCoverageDisplayId = screenInfo.screenInfoDate[0].spatialCoverage;
                    var folderDivWithCheckbox = document.createElement('div');
                    folderDivWithCheckbox.className = 'folder-with-checkbox';
                    imagesDiv.appendChild(folderDivWithCheckbox);
                    var folderDiv = document.createElement('div');
                    folderDiv.className = 'folder';
                    folderDivWithCheckbox.appendChild(folderDiv);
            
                    var folderHeader = document.createElement('div');
                    folderHeader.className = 'folder-header';
                    folderHeader.innerHTML = displayId + ' <span class="arrow-down fas fa-caret-down"></span>';
                    folderDiv.appendChild(folderHeader);
                    var imagesContainer = document.createElement('div');
                    imagesContainer.className = 'images-container';
                    folderDiv.appendChild(imagesContainer);

                    imageUrlList = [];
                    var isFirstImage = true;

                    screenInfo.screenInfoDate.forEach(screen => {
                        var imageUrl = screen.imageUrl;
                        var overlayPath = screen.overlayPath;
                        var spatialCoverage = screen.spatialCoverage;
                        var spatialBounds = screen.spatialBounds;
                        var publishDate = screen.publishDate;
                        var cloudCover = screen.cloudCover;
                        var overlaySpec = screen.overlaySpec;
                        var displayImageId = screen.displayImagesId;
                        imageUrlList.push(imageUrl);
                        var inputCheckbox;

                        var info = {
                            imageUrl: imageUrl,
                            overlayPath: overlayPath,
                            spatialCoverage: spatialCoverage,
                            spatialBounds: spatialBounds
                        };

                        imageInfo[displayImageId] = info;

                        var imagesContainerChild = document.createElement('div');
                        imagesContainerChild.className = 'images-container-child';
                        imagesContainerChild.id = displayImageId;
                        imagesContainer.appendChild(imagesContainerChild);

                        inputCheckbox = document.createElement('input');
                        inputCheckbox.type = 'checkbox';
                        inputCheckbox.id = "input-checkbox";
                        imagesContainerChild.appendChild(inputCheckbox);

                        var imagesContainerElement = document.createElement('div');
                        imagesContainerElement.className = 'images-container-element';
                        imagesContainerChild.appendChild(imagesContainerElement);

                        var imageWithCloud = document.createElement('div');
                        imageWithCloud.className = 'images-with-cloud';
                        imagesContainerElement.appendChild(imageWithCloud);

                        var imgElement = document.createElement('img');
                        imgElement.src = imageUrl;
                        imgElement.alt = 'Image';
                        imgElement.width = '270';
                        imgElement.height = '270';
                        imageWithCloud.appendChild(imgElement);

                        var cloudinessDiv = document.createElement('div');
                        cloudinessDiv.className = 'cloudiness-scale';
                        imageWithCloud.appendChild(cloudinessDiv);

                        var scaleLabel = document.createElement('div');
                        scaleLabel.className = 'scale-label';

                        var icon = document.createElement('i');
                        icon.className = 'fas fa-cloud';

                        scaleLabel.appendChild(icon);
                        scaleLabel.appendChild(document.createTextNode(' ' + cloudCover + "%"));

                        cloudinessDiv.appendChild(scaleLabel);

                        var scaleBarContainer = document.createElement('div');
                        scaleBarContainer.className = 'scale-bar-container';
                        cloudinessDiv.appendChild(scaleBarContainer);

                        var scaleBar = document.createElement('div');
                        scaleBar.className = 'scale-bar';
                        scaleBar.style.height =  cloudCover + "%";
                        scaleBarContainer.appendChild(scaleBar);

                        imagesContainerElement.appendChild(imageWithCloud);

                        var dateElement = document.createElement('span');
                        dateElement.textContent = publishDate;
                        imagesContainerElement.appendChild(dateElement);

                        if (isFirstImage) {
                            var bounds = L.latLngBounds(
                                L.latLng(spatialBounds[0][1]+0.5, spatialBounds[0][0]+0.5),
                                L.latLng(spatialBounds[2][1]-0.5, spatialBounds[2][0]-0.5) 
                            );
                            inputCheckbox.checked = true;
                            selectedImages[displayImageId] = info;
                            isFirstImage = false;
                            var layer = L.tileLayer(overlayPath, bounds).addTo(map);
                            selectedLayers[displayImageId] = layer;
                        } else {
                            inputCheckbox.checked = false;
                        }

                        inputCheckbox.addEventListener('change', function() {

                            var displayImageId = this.parentElement.id;
    
                            if (this.checked) {
                                selectedImages[displayImageId] = imageInfo[displayImageId];
                            } else {
                                delete selectedImages[displayImageId];
                                if (selectedLayers[displayImageId]) {
                                    map.removeLayer(selectedLayers[displayImageId]);
                                    delete selectedLayers[displayImageId];
                                }
                            }
                            updateMap();
                        });
                    }) 

                    folderHeader.addEventListener('click', function() {
                        var imagesContainer = this.nextElementSibling;
                        var displayStyle = window.getComputedStyle(imagesContainer).getPropertyValue('display');
                        var displayIdFroRectangle = this.textContent.split(' ')[0];
                        var parentFolder = this.parentElement;
                        var folderWithCheckbox = parentFolder.parentElement;
  
                        if (displayStyle === 'none') {
                            imagesContainer.style.display = 'flex';
                            this.id = 'active-folder';
                            this.innerHTML = displayIdFroRectangle + ' <span class="arrow-down fas fa-caret-up"></span>';
                            showRectangle(displayIdFroRectangle);
                        } else {
                            imagesContainer.style.display = 'none';
                            this.id = '';
                            this.innerHTML = displayIdFroRectangle + ' <span class="arrow-down fas fa-caret-down"></span>';
                            hideRectangle(displayIdFroRectangle);
                        }
                    });

                    createCoordinates(spatialCoverageDisplayId, displayId, imageUrlList);
                }
            }
            document.getElementById('loader').style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loader').style.display = 'none';
        });
    }

    function deleteRectangle() {
        for (var displayId in displayStates) {
            hideRectangle(displayId);
        }
        displayStates = [];
    }

    function deleteRectanleCoordinates() {
        rectangleCoordinates.forEach(function(rectangle) {
            rectangle.remove();
        });
        rectangleCoordinates = [];
    }

    function deleteLayer() {
        for (var displayImageId in selectedLayers) {
            var layerToRemove = selectedLayers[displayImageId];
            if (layerToRemove) {
                map.removeLayer(layerToRemove);
                delete selectedLayers[displayImageId];
            }
        }
        selectedImages = {};
        selectedLayers = {};
    }

    // function updateMap() {
    //     for (var displayImageId in selectedImages) {
    //         var imageInfo = selectedImages[displayImageId];
    //         var overlayPath = imageInfo.overlayPath;
    //         var spatialCoverage = imageInfo.spatialCoverage;
    //         var spatialBounds = imageInfo.spatialBounds;

    //         var bounds = L.latLngBounds(
    //             L.latLng(spatialBounds[0][1]+0.5, spatialBounds[0][0]+0.5),
    //             L.latLng(spatialBounds[2][1]-0.5, spatialBounds[2][0]-0.5)
    //         );

    //         if (!selectedLayers[displayImageId]) {
    //             var layer = L.tileLayer(overlayPath, bounds).addTo(map);
    //             selectedLayers[displayImageId] = layer;
    //         } else {
    //             selectedLayers[displayImageId].setUrl(overlayPath);
    //         }
    //     }
    // }

    function updateMap() {
        for (var displayImageId in selectedImages) {
            var imageInfo = selectedImages[displayImageId];
            var overlayPath = imageInfo.overlayPath;
            var spatialBounds = imageInfo.spatialBounds;
    
            var bounds = L.latLngBounds(
                L.latLng(spatialBounds[0][1] + 0.5, spatialBounds[0][0] + 0.5),
                L.latLng(spatialBounds[2][1] - 0.5, spatialBounds[2][0] - 0.5)
            );
    
            if (!selectedLayers[displayImageId]) {
                var layer = L.tileLayer(overlayPath, bounds).addTo(map);
                selectedLayers[displayImageId] = layer;
            } else {
                selectedLayers[displayImageId].setUrl(overlayPath);
            }
        }
    }
    

    function showRectangle(displayId) {
        if (rectangle) {
            map.removeLayer(rectangle);
        }
        rectangleCoordinates.forEach(function(rectangle) {
            if (rectangle.options.displayId === displayId) {
                if (!displayStates[displayId]) {
                    displayStates[displayId] = {
                        currentImageIndex: 0,
                        imageUrlList: rectangle.options.imageUrlList
                    };
                }
    
                var state = displayStates[displayId];
                var imageBounds = rectangle.options.coordinates; // Примерные координаты
    
                rectangle.polygon = L.polygon(imageBounds, {
                    fillOpacity: 0,
                    color: 'red',
                    weight: 2
                }).addTo(map);
            }
        });
    }

    function hideRectangle(displayId) {
        rectangleCoordinates.forEach(function(rectangle) {
            if (rectangle.options.displayId === displayId) {
                if (rectangle.imageOverlay) {
                    map.removeLayer(rectangle.imageOverlay);
                }
                if (rectangle.polygon) {
                    map.removeLayer(rectangle.polygon);
                }
            }
        });
    }

    function addFilterButton() {
        var startDate = document.getElementById('start-date').value;
        var endDate = document.getElementById('end-date').value;
        var minCloudCover = document.getElementById('min-value').value;
        var maxCloudCover = document.getElementById('max-value').value;
        var includeUnknown = document.getElementById('checkbox-unkdown').checked;
        var maxResults = document.getElementById('max-results').value;
    
        startDate = startDate || '2024-01-01';
        endDate = endDate || '2024-12-31';
        minCloudCover = minCloudCover || 0;
        maxCloudCover = maxCloudCover || 100;
        maxResults = maxResults || 1000;

        var filter = {
            startDate: startDate,
            endDate: endDate,
            minCloudCover: minCloudCover,
            maxCloudCover: maxCloudCover,
            includeUnknown: includeUnknown,
            maxResults: maxResults
        };

        fetchDataFilter(filter)
    }

    // Отправка данных на сервер
    function fetchDataFilter(filters) {
        fetch('/maps/get_filters/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                filters: filters
            })
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Отправка данных на сервер
    function fetchDataSize(size) {
        fetch('/maps/get_size/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                size: size
            })
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function handleButtonClick() {
        var selectElement = document.getElementById('select-bands');
        selectElement.selectedIndex = 0;
        addFilterButton();
        // selectBands();
        sendCoordinates();
    }

    function selectBands() {
        var mapLegend = document.getElementById('map-legend');
        var maplegendlist = ['nbr', 'ndmi', 'ndsi', 'ndvi', 'savi'];
        deleteLayer();
        var selectBand = document.getElementById('select-bands').value;
        selectBand = selectBand || "reflectivecolor";
        if (maplegendlist.includes(selectBand)) {
            mapLegend.style.display = "block";
        } else {
            mapLegend.style.display = "none"; // Скрываем mapLegend, если выбранная полоса не входит в массив
        }
        fetchDataBand(selectBand);
    }
    

    function fetchDataBand(band) {
        fetch('/maps/get_band/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                band: band
            })
        })
        .then(response => response.json())
        .then(data => {
            for (var displayImageId in selectedLayers) {
                map.removeLayer(selectedLayers[displayImageId]);
            }
            selectedLayers = {};
            // selectedImages = {};
        
            for (var displayId in data.screenInfo) {
                if (displayId) {
                    var screenInfo = data.screenInfo[displayId];
                    var isFirstImage = true;
        
                    screenInfo.screenInfoDate.forEach(screen => {
                        var inputCheckbox = document.getElementById(`input-checkbox`);
                        var imageUrl = screen.imageUrl;
                        var spatialCoverage = screen.spatialCoverage;
                        var overlayPath = screen.overlayPath;
                        var spatialBounds = screen.spatialBounds;
                        var displayImageId = screen.displayImagesId;

                        var info = {
                            imageUrl: imageUrl,
                            overlayPath: overlayPath,
                            spatialCoverage: spatialCoverage,
                            spatialBounds: spatialBounds
                        };
        
                        if (isFirstImage) {
                            console.log("band data if");
                            var bounds = L.latLngBounds(
                                L.latLng(spatialBounds[0][1] + 0.5, spatialBounds[0][0] + 0.5),
                                L.latLng(spatialBounds[2][1] - 0.5, spatialBounds[2][0] - 0.5)
                            );
                            selectedImages[displayImageId] = info;
                            // inputCheckbox.checked = false;
                            isFirstImage = false;
                            var layer = L.tileLayer(overlayPath, bounds).addTo(map);
                            selectedLayers[displayImageId] = layer;
                        } else {
                            console.log("band data else");
                            inputCheckbox.checked = false;
                        }

        
                        imageInfo[displayImageId] = info;
                        // selectedImages[displayImageId] = info;
        
                        // Удаляем старый обработчик перед добавлением нового
                        // if (inputCheckbox) {
                        //     var newCheckbox = inputCheckbox.cloneNode(true);
                        //     inputCheckbox.parentNode.replaceChild(newCheckbox, inputCheckbox);
                        //     inputCheckbox = newCheckbox;
                        // } else {
                        //     inputCheckbox = document.createElement('input');
                        //     inputCheckbox.type = 'checkbox';
                        //     inputCheckbox.id = `input-checkbox`;
                        //     document.body.appendChild(inputCheckbox); // Пример добавления на страницу
                        // }
        
                        // inputCheckbox.addEventListener('change', function () {
                        //     var displayImageId = this.parentElement.id;
        
                        //     if (this.checked) {
                        //         selectedImages[displayImageId] = imageInfo[displayImageId];
                        //     } else {
                        //         delete selectedImages[displayImageId];
                        //         if (selectedLayers[displayImageId]) {
                        //             map.removeLayer(selectedLayers[displayImageId]);
                        //             delete selectedLayers[displayImageId];
                        //         }
                        //     }
                        //     updateMap();
                        // });
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    

    document.getElementById('start-date').addEventListener('change', addFilterButton);
    document.getElementById('end-date').addEventListener('change', addFilterButton);
    document.getElementById('min-value').addEventListener('input', addFilterButton);
    document.getElementById('max-value').addEventListener('input', addFilterButton);
    document.getElementById('checkbox-unkdown').addEventListener('change', addFilterButton);
    document.getElementById('max-results').addEventListener('input', addFilterButton);
    document.getElementById('select-bands').addEventListener('change', selectBands);

    // Функция для получения CSRF токена
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const links = document.querySelectorAll('.subcategories a');
    const divs = document.querySelectorAll('.subcategories-div > div');

    function activateLink(activeLink) {
        links.forEach(link => {
            if (link === activeLink) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        const targetId = activeLink.id + '-div';
        divs.forEach(div => {
            if (div.id === targetId) {
                div.style.display = 'flex';
            } else {
                div.style.display = 'none';
            }
        });
    }

    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            activateLink(link);
        });
    });

    activateLink(document.getElementById('filter'));

    // Экспортируем функции для использования в других скриптах
    window.sendCoordinates = sendCoordinates;
    window.addFilterButton = addFilterButton;
    window.handleButtonClick = handleButtonClick;

    var slider = document.getElementById('slider');
    var minValue = document.getElementById('min-value');
    var maxValue = document.getElementById('max-value');

    noUiSlider.create(slider, {
        start: [0, 100], 
        connect: true,
        range: {
            'min': 0,
            'max': 100
        },
        format: {
            to: function (value) {
                return Math.round(value); 
            },
            from: function (value) {
                return parseFloat(value);
            }
        }
    });

    slider.noUiSlider.on('update', function (values, handle) {
        if (handle === 0) {
            minValue.value = Math.round(values[0]);
        }
        if (handle === 1) {
            maxValue.value = Math.round(values[1]);
        }
    });

    const selectElement = document.getElementById('select-bands');
    const infoIcon = document.getElementById('icon-info');
    const infoModal = document.getElementById('info-modal');

    const infoText = {
        reflectivecolor: 'Отражающий цвет: Спутник Landsat 8 измеряет различные диапазоны длин волн в электромагнитном спектре. Каждый из этих диапазонов называется каналы, а всего на спутнике Landsat 8 11 каналов. Первые 7 из этих каналов относятся к видимой и инфракрасной частям спектра и широко известны как "отражающие каналы" и регистрируются операционным наземным тепловизором (OLI) на борту спутника Landsat 8.',
        thermalbrowse: 'Термальное изображение - канал 10: Каналы 10 и 11 относятся к тепловому инфракрасному диапазону, или TIR – они позволяют видеть тепло. Вместо того, чтобы измерять температуру воздуха, как это делают метеостанции, они измеряют температуру самой земли, которая часто намного горячее.',
        qualitybrowse: 'Обзор качества: Quality Browse - это термин, который используется для описания визуализации или анализа качества данных, обычно спутниковых изображений или другой дистанционно получаемой информации.',
        cir: 'Цветное инфракрасное изображение - каналы 5, 4, 3: В цветных инфракрасных изображениях (CIR) каналы используются следующим образом: ближний инфракрасный (канал 5) отображается как красный, красный (канал 4) отображается как зеленый, и зеленый (канал 3) отображается как синий. Эта комбинация спектральных диапазонов подчеркивает определенные характеристики поверхности Земли, такие как состояние растительности, водоемы и урбанизированные территории.',
        urban: 'Ложные цвета для городских территорий - каналы 7, 6, 5: В изображениях с ложными цветами для городских территорий (False Color Urban) каналы используются следующим образом: средний инфракрасный (канал 7) отображается как красный, ближний инфракрасный (канал 6) отображается как зеленый, и ближний инфракрасный (канал 5) отображается как синий. Эта комбинация спектральных диапазонов подчеркивает особенности урбанизированных зон.',
        vegetationanalysis: 'Ложные цвета для анализа растительности - каналы 6, 5, 4: В изображениях с ложными цветами для анализа растительности (False Color Vegetation Analysis) каналы используются следующим образом: ближний инфракрасный (канал 6) отображается как красный, ближний инфракрасный (канал 5) отображается как зеленый, и красный (канал 4) отображается как синий. Эта комбинация спектральных диапазонов позволяет более эффективно анализировать растительный покров.',
        naturalcolor: 'Естественный цвет - каналы 4, 3, 2: В изображениях естественного цвета (Natural Color) каналы используются следующим образом: красный (канал 4) отображается как красный, зеленый (канал 3) отображается как зеленый, и синий (канал 2) отображается как синий. Эта комбинация спектральных диапазонов создает изображения, которые имеют вид, похожий на то, что видит человеческий глаз.',
        nir: 'Ближний инфракрасный - канал 5: Ближний инфракрасный (Near Infrared, NIR) - канал 5 (Band 5) описывает спектральный канал, используемый в спутниковой или аэрофотосъемке для измерения инфракрасного излучения, невидимого для человеческого глаза. Канал 5 (NIR) часто используется для анализа растительного покрова, водных ресурсов и детектирования изменений на земной поверхности.',
        nbr: '<p>Нормализованный коэффициент ожогов (Normalized Burn Ratio, NBR) - это индекс, используемый для оценки степени повреждения растительности после пожаров, основанный на данных многоспектральных изображений.</p><pre><code>NBR = (NIR - SWIR) / (NIR + SWIR)</code></pre><p>Где:</p><ul><li><strong>NIR</strong> - значения инфракрасного излучения, близкого к видимому спектру (ближний инфракрасный)</li><li><strong>SWIR</strong> - значения коротковолнового инфракрасного излучения</li></ul><p>Значения NBR варьируются от -1 до 1.</p>',
        ndmi: '<p>Нормализованный индекс различия влаги (Normalized Difference Moisture Index, NDMI) - это индекс, используемый для оценки содержания влаги в растительности и почве на основе данных многоспектральных изображений.</p><pre><code>NDMI = (NIR - SWIR) / (NIR + SWIR)</code></pre><p>Где:</p><ul><li><strong>NIR</strong> - значения инфракрасного излучения, близкого к видимому спектру (ближний инфракрасный)</li><li><strong>SWIR</strong> - значения коротковолнового инфракрасного излучения</li></ul><p>Значения NDMI могут использоваться для определения влажности растительности и почвы, что позволяет анализировать условия засухи, состояние растительного покрова и другие экологические параметры.</p>',
        ndsi: '<p>Нормализованный индекс различия снега (Normalized Difference Snow Index, NDSI) - это индекс, используемый для обнаружения снега на многоспектральных изображениях.</p><pre><code>NDSI = (Green - SWIR) / (Green + SWIR)</code></pre><p>Где:</p><ul><li><strong>Green</strong> - значения зеленого канала изображения</li><li><strong>SWIR</strong> - значения коротковолнового инфракрасного излучения</li></ul><p>Высокие значения NDSI обычно свидетельствуют о наличии снега, так как снег отражает большую часть зеленого и коротковолнового инфракрасного излучения.</p>',
        ndvi: '<p>Normalized Difference Vegetation Index (NDVI) - нормализованный индекс различия вегетации, это индекс, который используется для оценки зеленой растительности на многоспектральных изображениях.</p><pre><code>NDVI = (NIR - Red) / (NIR + Red)</code></pre><p>Где:</p><ul><li><strong>NIR</strong> - значения инфракрасного излучения близкого к видимому спектру (ближний инфракрасный)</li><li><strong>Red</strong> - значения красного канала изображения</li></ul><p>Высокие значения NDVI обычно указывают на наличие здоровой растительности, в то время как низкие значения могут указывать на отсутствие или стресс растительности.</p>',
        savi: '<p>Soil Adjusted Vegetation Index (SAVI) - это индекс, который подобен NDVI, но учитывает влияние почвы на индексы вегетации, что делает его более надежным для оценки.</p><pre><code>SAVI = ((NIR - Red) * (1 + L)) / (NIR + Red + L)</code></pre><p>Где:</p><ul><li><strong>NIR</strong> - значения инфракрасного излучения близкого к видимому спектру (ближний инфракрасный)</li><li><strong>Red</strong> - значения красного канала изображения</li><li><strong>L</strong> - константа, обычно принимающая значение от 0 до 1 и используемая для коррекции влияния почвы на индекс вегетации</li></ul>'
    };

    infoIcon.addEventListener('mouseover', function () {
        const selectedValue = selectElement.value;
        infoModal.innerHTML = infoText[selectedValue] || 'Выберите опцию для получения информации';
        const rect = infoIcon.getBoundingClientRect();
        let right = window.innerWidth - rect.right;
        let top = rect.bottom + window.scrollY;

        // // Проверка, выходит ли модальное окно за пределы экрана справа
        // if (left + infoModal.offsetWidth >= window.innerWidth) {
        //     left = window.innerWidth - infoModal.offsetWidth + 500; // Отступ 10px от края
        // }

        // Проверка, выходит ли модальное окно за пределы экрана снизу
        if (top + infoModal.offsetHeight > window.innerHeight) {
            top = rect.top + window.scrollY - infoModal.offsetHeight - 10; // Отступ 10px от иконки
        }

        infoModal.style.right = `${right}px`;
        infoModal.style.top = `${top}px`;
        infoModal.style.display = 'block';
    });

    infoIcon.addEventListener('mouseout', function () {
        infoModal.style.display = 'none';
    });
});

