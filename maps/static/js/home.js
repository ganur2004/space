document.addEventListener('DOMContentLoaded', function() {
    // Инициализация карты
    var map = L.map('map', {
        center: [45, 70],
        zoom: 3,
        zoomControl: false // Отключаем стандартный zoom control
    });

    // Добавление OpenStreetMap слоя
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 1,
    }).addTo(map);

    L.control.zoom({
        position: 'topright' // Позиция: 'topleft', 'topright', 'bottomleft', 'bottomright'
    }).addTo(map);

    // Добавление иконки местоположения
    var initialLatLng = [45, 70];
    var marker = L.marker(initialLatLng, { draggable: true }).addTo(map);

    updateCoordinates(initialLatLng[0], initialLatLng[1]);

    marker.on('drag', function (e) {
        var latlng = e.target.getLatLng();
        updateCoordinates(latlng.lat, latlng.lng);
    });

    function updateCoordinates(lat, lng) {
        document.getElementById('lat').innerText = lat.toFixed(3);
        document.getElementById('long').innerText = lng.toFixed(3);
    }

    function sendCoordinates() {
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

    function fetchData(lat, lng) {
        // Отправка данных на сервер
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
            // Обработка полученных данных
            console.log(data); // Проверьте данные в консоли

            // Отобразите изображения на странице
            var imagesDiv = document.getElementById('result-div');
            imagesDiv.innerHTML = ''; // Очищаем содержимое перед добавлением новых изображений

            data.imageUrls.forEach(imageUrl => {
                var aElement = document.createElement('a');
                aElement.className = 'lightzoom';
                imagesDiv.appendChild(aElement);
                var imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = 'Image';
                imgElement.width = '300';
                imgElement.height = '300';
                aElement.appendChild(imgElement);
            });
            document.getElementById('loader').style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);

            // Скрыть элемент загрузки в случае ошибки
            document.getElementById('loader').style.display = 'none';
        });
    }

    function addFilterButton() {
        // Собираем данные из полей ввода
        var startDate = document.getElementById('start-date').value;
        console.log(startDate);
        var endDate = document.getElementById('end-date').value;
        console.log(endDate);
        var minCloudCover = document.getElementById('min-value').value;
        console.log(minCloudCover);
        var maxCloudCover = document.getElementById('max-value').value;
        console.log(maxCloudCover);
        var includeUnknown = document.getElementById('checkbox-unkdown').checked;
        console.log(includeUnknown);
        var maxResults = document.getElementById('max-results').value;
        console.log(maxResults);
    
        // Устанавливаем значения по умолчанию для фильтров, если они не заполнены
        startDate = startDate || '2024-01-01'; // Начальная дата по умолчанию
        endDate = endDate || '2024-12-31'; // Конечная дата по умолчанию
        minCloudCover = minCloudCover || 0; // Минимальный облачный покров по умолчанию
        maxCloudCover = maxCloudCover || 100; // Максимальный облачный покров по умолчанию
        maxResults = maxResults || 1000; // Максимальное число результатов по умолчанию
    
        // Создаем объект с данными фильтра
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

    function fetchDataFilter(filters) {
        // Отправка данных на сервер
        fetch('/maps/get_filters/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                filters: filters // Передаем данные фильтров
            })
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Error:', error);
        });
    }

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

    // Изначально активируем ссылку "Фильтр"
    activateLink(document.getElementById('filter'));

    // Экспортируем функции для использования в других скриптах
    window.sendCoordinates = sendCoordinates;
    window.addFilterButton = addFilterButton;

    // var slider = document.getElementById('slider');
    // var minValue = document.getElementById('min-value');
    // var maxValue = document.getElementById('max-value');

    // noUiSlider.create(slider, {
    //     start: [0, 100], // Начальные значения для бегунков
    //     connect: true, // Связь между бегунками
    //     range: {
    //         'min': 0,
    //         'max': 100
    //     }
    // });

    // slider.noUiSlider.on('update', function (values, handle) {
    //     if (handle === 0) {
    //         minValue.value = values[0];
    //     }
    //     if (handle === 1) {
    //         maxValue.value = values[1];
    //     }
    // });

    var slider = document.getElementById('slider');
    var minValue = document.getElementById('min-value');
    var maxValue = document.getElementById('max-value');

    noUiSlider.create(slider, {
        start: [0, 100], // Начальные значения для бегунков
        connect: true, // Связь между бегунками
        range: {
            'min': 0,
            'max': 100
        },
        format: {
            to: function (value) {
                return Math.round(value); // Округляем значение до целого числа
            },
            from: function (value) {
                return parseFloat(value); // Преобразуем обратно в число с плавающей запятой
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

