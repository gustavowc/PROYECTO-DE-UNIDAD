let map, userMarker;
let markers = [];
let userLocation = null; // Aquí almacenamos la ubicación del usuario

let directionsService, directionsRenderer; // Declaramos las variables globalmente
let suggestionWindow; // Ventana de sugerencias

// Probabilidades a priori para cada tipo de lugar (pueden ser ajustadas según preferencias)
let priorProbabilities = {
    'restaurant': 0.2,
    'cafe': 0.1,
    'art_gallery': 0.05,
    'tourist_attraction': 0.1,
    'laundry': 0.05,
    'grocery_or_supermarket': 0.1,
    'shopping_mall': 0.05,
    'park': 0.1,
    'gym': 0.05,
    'hospital': 0.05,
    'pharmacy': 0.05,
    'night_club': 0.05,
    'movie_theater': 0.05,
    'amusement_park': 0.05,
    'museum': 0.05,
    'zoo': 0.05
};

// Probabilidad de realizar acciones en todos los lugares (se asume constante para este ejemplo)
let actionProbability = 0.5;

// Probabilidades condicionales de que el usuario haga clic en un tipo de lugar
let clickProbabilities = {
    'restaurant': 0.2,
    'cafe': 0.1,
    'art_gallery': 0.05,
    'tourist_attraction': 0.1,
    'laundry': 0.05,
    'grocery_or_supermarket': 0.1,
    'shopping_mall': 0.05,
    'park': 0.1,
    'gym': 0.05,
    'hospital': 0.05,
    'pharmacy': 0.05,
    'night_club': 0.05,
    'movie_theater': 0.05,
    'amusement_park': 0.05,
    'museum': 0.05,
    'zoo': 0.05
};

function initMap() {
    // Coordenadas de Puno, Perú
    const puno = { lat: -15.8402, lng: -70.0219 };

    // Crear el mapa centrado en Puno
    map = new google.maps.Map(document.getElementById('map'), {
        center: puno,
        zoom: 14
    });

    // Inicializamos el DirectionsService y DirectionsRenderer dentro de la función initMap
    directionsService = new google.maps.DirectionsService(); // Inicialización del servicio de direcciones
    directionsRenderer = new google.maps.DirectionsRenderer(); // Inicialización del renderizador de rutas

    // Configurar el renderer para mostrar la ruta
    directionsRenderer.setMap(map);  // Asegúrate de que se establezca el renderer en el mapa

    // Evento: cuando el usuario hace clic en el mapa
    map.addListener('click', (event) => {
        const clickLocation = event.latLng;

        // Actualizar la ubicación del usuario
        userLocation = clickLocation;
        console.log("Ubicación del usuario: ", userLocation);

        // Verificar si el clic se realizó en una calle transitable
        verifyTransitPath(clickLocation);
    });

    // Crear la ventana de sugerencias
    createSuggestionWindow();

    // Inicializar la ventana de sugerencias con las probabilidades iniciales
    const recommendationProbabilities = calculateRecommendationProbabilities();
    updateSuggestionWindow(recommendationProbabilities);
}

// Función para verificar si el clic fue en una calle transitable
function verifyTransitPath(location) {
    const request = {
        origin: location,   // El punto clickeado
        destination: location,  // El destino es el mismo punto
        travelMode: google.maps.TravelMode.WALKING // Rutas peatonales
    };

    // Realiza la solicitud para obtener una ruta transitable
    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result.routes.length > 0) {
            // Si hay rutas, significa que es una ubicación transitable
            placeUserMarker(location);
            // Limpiar los marcadores anteriores
            clearMarkers();
            // Llamar a la función para buscar lugares cercanos
            searchNearbyPlaces(location);
        } else {
            // Si no hay rutas, no es un lugar transitable
            alert('Por favor, haga clic en una calle o avenida transitable.');
        }
    });
}

// Colocar el marcador del usuario en el mapa
function placeUserMarker(location) {
    if (userMarker) {
        userMarker.setPosition(location);
    } else {
        userMarker = new google.maps.Marker({
            position: location,
            map: map,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Marcador rojo
                scaledSize: new google.maps.Size(40, 40) // Ajusta el tamaño del icono
            }
        });
    }
}

// Función para buscar lugares cercanos
function searchNearbyPlaces(location) {
    const types = [
        'restaurant', 'cafe', 'art_gallery', 'tourist_attraction', 'laundry',
        'grocery_or_supermarket', 'shopping_mall', 'park', 'gym',
        'hospital', 'pharmacy', 'night_club', 'movie_theater', 'amusement_park', 'museum', 'zoo'
    ];

    types.forEach(type => {
        const request = {
            location: location,
            radius: '300', // 300 metros
            type: type // Se realiza la búsqueda para cada tipo
        };

        const service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                results.forEach(place => {
                    const placeMarker = new google.maps.Marker({
                        position: place.geometry.location,
                        map: map,
                        title: place.name,
                        icon: {
                            url: place.icon,
                            scaledSize: new google.maps.Size(50, 50) // Aumenta el tamaño del icono
                        }
                    });

                    // Agregar animación al marcador
                    placeMarker.setAnimation(google.maps.Animation.BOUNCE);
                    markers.push(placeMarker);

                    const infoWindow = new google.maps.InfoWindow();
                    // Llamada para obtener detalles adicionales del lugar
                    getPlaceDetails(place.place_id, infoWindow, placeMarker);
                });
            } else {
                console.error('Error al buscar lugares cercanos para el tipo ' + type + ': ' + status);
            }
        });
    });
}

// Obtener detalles adicionales del lugar utilizando el `place_id` de Google Places
function getPlaceDetails(placeId, infoWindow, marker) {
    const service = new google.maps.places.PlacesService(map);
    service.getDetails({ placeId: placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            const content = `
                <div style="max-width: 300px; padding: 10px;">
                    <strong>${place.name}</strong><br>
                    <p style="font-size: 12px; color: gray;">${place.formatted_address}</p>
                    <p><strong>Teléfono:</strong> ${place.formatted_phone_number || 'No disponible'}</p>
                    <p><strong>Tipo:</strong> ${place.types.join(', ')}</p>
                    <button onclick="handleGoToPlace('${place.types[0]}', ${place.geometry.location.lat()}, ${place.geometry.location.lng()})">
                        Ir a
                    </button>
                    ${place.photos ? `<img src="${place.photos[0].getUrl({maxWidth: 100, maxHeight: 100})}" alt="Foto" style="width: 100%; margin-top: 10px;">` : ''}
                </div>
            `;

            infoWindow.setContent(content);
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
        }
    });
}

// Nueva función: Manejar el clic en "Ir a" y recalcular probabilidades
function handleGoToPlace(placeType, destinationLat, destinationLng) {
    // Actualizar probabilidades de recomendación al hacer clic en "Ir a"
    updateRecommendationOnInteraction(placeType);
    
    // Calcular la ruta hacia el destino seleccionado
    calculateRoute(destinationLat, destinationLng);
}

// Función para recalcular las probabilidades basadas en la interacción con el lugar
function updateRecommendationOnInteraction(placeType) {
    // Aumentar la probabilidad condicional de que el usuario interactúe con este tipo de lugar
    clickProbabilities[placeType] += 0.05; // Incrementamos la probabilidad de clic para este tipo de lugar

    // Asegurarnos de que las probabilidades se mantengan en un rango válido (0 a 1)
    if (clickProbabilities[placeType] > 1) {
        clickProbabilities[placeType] = 1;
    }

    // Recalcular las probabilidades de recomendación con el nuevo valor
    const recommendationProbabilities = calculateRecommendationProbabilities();

    // Actualizar la ventana de sugerencias
    updateSuggestionWindow(recommendationProbabilities);
}

// Función para calcular las probabilidades de recomendación basadas en Bayes
function calculateRecommendationProbabilities() {
    let recommendationProbabilities = {};

    for (let placeType in priorProbabilities) {
        const prior = priorProbabilities[placeType];
        const clickProb = clickProbabilities[placeType];
        const probability = (clickProb * prior) / actionProbability;

        recommendationProbabilities[placeType] = probability;
    }

    return recommendationProbabilities;
}

// Función para crear la ventana de sugerencias
function createSuggestionWindow() {
    suggestionWindow = document.createElement('div');
    suggestionWindow.style.position = 'absolute';
    suggestionWindow.style.top = '10px';
    suggestionWindow.style.right = '10px';
    suggestionWindow.style.padding = '15px';
    suggestionWindow.style.backgroundColor = 'white';
    suggestionWindow.style.border = '1px solid #ccc';
    suggestionWindow.style.width = '300px';
    suggestionWindow.style.height = 'auto';
    suggestionWindow.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
    suggestionWindow.innerHTML = '<h3>Recomendaciones</h3><div id="suggestion-list"></div>';

    document.body.appendChild(suggestionWindow);
}

// Función para actualizar la ventana de sugerencias
function updateSuggestionWindow(recommendationProbabilities) {
    const suggestionList = document.getElementById('suggestion-list');
    suggestionList.innerHTML = ''; // Limpiar la lista actual

    // Convertir el objeto de probabilidades a un array de pares clave-valor y ordenarlo
    const sortedRecommendations = Object.entries(recommendationProbabilities)
        .sort((a, b) => b[1] - a[1]);

    // Mostrar los lugares recomendados en orden descendente de probabilidad
    sortedRecommendations.forEach(([type, probability]) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.innerHTML = `<strong>${type}</strong>: ${(probability * 100).toFixed(2)}%`;
        suggestionList.appendChild(suggestionItem);
    });
}

// Función para calcular la ruta
function calculateRoute(destinationLat, destinationLng) {
    if (userLocation) {
        const request = {
            origin: userLocation, // Usamos la ubicación del usuario
            destination: { lat: destinationLat, lng: destinationLng }, // Destino clickeado
            travelMode: google.maps.TravelMode.WALKING // Usamos modo de viaje peatonal
        };

        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result); // Mostrar la ruta en el mapa
            } else {
                console.error('Error al calcular la ruta: ' + status);
            }
        });
    } else {
        alert("Primero debes seleccionar una ubicación inicial.");
    }
}

// Función para limpiar todos los marcadores anteriores
function clearMarkers() {
    markers.forEach(marker => {
        marker.setMap(null); // Eliminar cada marcador del mapa
    });
    markers = []; // Reiniciar la lista de marcadores
}
