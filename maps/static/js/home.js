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
                    var inputCheckbox;
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

    function updateMap() {
        for (var displayImageId in selectedImages) {
            var imageInfo = selectedImages[displayImageId];
            var overlayPath = imageInfo.overlayPath;
            var spatialCoverage = imageInfo.spatialCoverage;
            var spatialBounds = imageInfo.spatialBounds;

            var bounds = L.latLngBounds(
                L.latLng(spatialBounds[0][1]+0.5, spatialBounds[0][0]+0.5),
                L.latLng(spatialBounds[2][1]-0.5, spatialBounds[2][0]-0.5)
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
        selectBands();
        sendCoordinates();
    }

    function selectBands() {
        var selectBand = document.getElementById('select-bands').value;
        selectBand = selectBand || "reflectivecolor";
        console.log(selectBand);
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
        .then(data => {
            // Обновить снимки на карте с новыми данными из 'data'
            // Пример:
            updateMap();
            sendCoordinates();
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
});

