/**
 * How to disapear completely will guide you out of existence.
 * 
 * MeetLab HU
 */


var RADIUS = 10 // default radius if not set in the file.

var USER_RADIUS = 5 // Radius the user has.

var DEBUG = location.hash == '#debug'; // When true, use a draggable circle as location.

var FILL_OPACITY = 0.3

var map;
var STATE_KEY = 'howToDisappearCompletely'
var state;
var player;

try {
    state = localStorage.getItem(STATE_KEY) ? JSON.parse(localStorage.getItem(STATE_KEY)) : false;
} catch (e) { toastr.error(e) }

function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}


function onLoad() {

    var start = [points[Object.keys(points)[0]].lat, points[Object.keys(points)[0]].lng];

    map = L.map('map').setView(start, 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    if (state) {
        $('.has-state').fadeIn();
    }
    else {
        $('.no-state').fadeIn();
    }

}

function gameOver(){
    $('.no-state').hide();
    $('.has-state').hide();
    $('.buttons').show();
    $('.restart-over').hide();
    $('.overlay').fadeIn(4000, function(){    
        $('.game-over').fadeIn(1000);        
        setTimeout(function(){
            $('.restart-over').fadeIn(1000);
        },8000)
    });
}

function startTrackingMe() {
    
    map.locate({ setView: !DEBUG, maxZoom: 16, watch: true });
}

var first = true;

var whereWasILast;

function updateState(playerPos) {

    // Navigate away from the main MENU.
    if (first) showMap(playerPos);

    // Show player on map
    positionPlayer(playerPos);


    var whereAmICurrently = getWhereAmI(playerPos);

    // If I where am I is not equal where I was, it means 
    // I either entered or exited a point.
    if (whereAmICurrently !== whereWasILast) {
        if (whereWasILast) onExit(whereWasILast);
        if (whereAmICurrently) onEnter(whereAmICurrently);
        whereWasILast = whereAmICurrently;
    }


}

var currentlyPlaying;
var currentlyPlayingChapter;

function onExit(exitFromPoint) {
    // Set the marker's style.
    console.log('Exit: ', exitFromPoint)
    exitFromPoint.marker.setStyle({ weight: '0px' })
    visit(exitFromPoint);
}

/**
 * If we are playing the current one, do not do anything.
 * If we are not playing anything, start playing that.
 * If we are playing a different, stop that one and start the current one.
 * @param {Object} point 
 */
function onEnter(point) {
    console.log('Enter: ', point)
    state.pointsAlreadyVisited[point.id] = true;
    saveState(state);
    updateChapter(point)    
    point.marker.setStyle({ weight: '13px' })

    if (currentlyPlaying) {
        // If there is something playing, but we have reached the next point.
        // Stop the last, and start the new point.
        if (point !== currentlyPlaying) {
            stopPlaying(currentlyPlaying);
            startPlaying(point);
        } else {
            // If re-entered the spot, do not stop playing.            
        }

        // If nothing is playing, start playing th current point.
    } else {
        startPlaying(point);
    }
    if (Object.keys(points).indexOf(point.id) === Object.keys(points).length-1){
        gameOver();
    }
}

function startPlaying(point) {
    currentlyPlaying = point;
    try {
        point.sound.play()
        point.sound.addEventListener("ended", function () {
            currentlyPlaying = false;
        });
    } catch (e) {
        console.error('would start playing ', point.id, 'if it had a sound file...')
    }
}


function stopPlaying(point) {
    try {
        point.sound.pause()        
    } catch (e) {
        console.error('would stop playing ', point.id, 'if it had a sound file...')
    }
}

function updateChapter(point) {

    // if (point.chapter !== state.chapter) {

    // }
    // var ambient = new Audio(`sounds/${AMBIENT}`);
    // ambient.loop = true;
    // ambient.play();

    showNextChapter(point.chapter)

    if (currentlyPlayingChapter){
        try{
            currentlyPlayingChapter.sound.pause()
        } catch(e){
            // nope.
        }        
    }
    currentlyPlayingChapter = chapters[point.chapter];
    currentlyPlayingChapter.sound.play();

    state.currentChapter = point.chapter;
    saveState(state);
}

function showNextChapter(chapter){
    var index = Object.keys(chapters).indexOf(chapter);
    if (Object.keys(chapters).length > index+1){
        var nextChapterKey = Object.keys(chapters)[index+1];
        // Show All
        _.filter(points, {chapter: nextChapterKey}).map(function(point){
            point.marker.setStyle({opacity: 1, fillOpacity: FILL_OPACITY});
        })
    }
}


function getWhereAmI(playerPos) {

    var pointsSortedByDistance = _.sortBy(Object.keys(points).map(function (key) {
        var point = points[key];
        point.currentDistance = L.GeometryUtil.distance(map, playerPos.latlng, point.marker.getLatLng());
        return point;
    }).filter(function(point){
        return isChapterAlreadyVisible(state, point.chapter, 1);
    }), 'currentDistance')

    var closestMarker = pointsSortedByDistance[0]

    // If we are in the closest point's range
    if (closestMarker.currentDistance - RADIUS < USER_RADIUS) {
        return closestMarker;
    }
    // If we aren't anywhere, just 
    return false;
}


function positionPlayer(playerPos) {

    // NYAAAH
    if (DEBUG) return;

    player.setLatLng(playerPos.latlng);
}

function showMap(playerPos) {    
    toastr.info(`Found you! ${playerPos.latlng.lat}:${playerPos.latlng.lng}`);
    $('.overlay').fadeOut(1000);
    first = false;

    player = L.circle(playerPos.latlng, playerPos.accuracy / 2).addTo(map).setStyle({ color: 'purple' });

    if (DEBUG) debug();
}

function onStart(lang) {
    state = { lang: lang, pointsAlreadyVisited: {} };
    saveState(state);

    initObjects(state);
}

function onContinue() {
    initObjects(state);
    if (state.currentChapter){
        chapters[state.currentChapter].sound.play();
    }
}


function restart() {
    localStorage.removeItem(STATE_KEY);
    state = false;    
    location.reload();
}

function initObjects(state) {

    setTimeout(function () {
        $('.buttons').fadeOut(1000);
    }, 10)


    map.on('locationfound', updateState);
    map.on('locationerror', toastr.error);

    // Load all the audio files.
    Object.keys(points).map(function (key) {
        var point = points[key];
        try {
            point.marker = L.circle([point.lat, point.lng], point.radius || RADIUS).addTo(map);
            point.marker.setStyle({ color: chapters[point.chapter].color, fillOpacity: FILL_OPACITY });
            point.sound = new Audio(`sounds/${state.lang}/${point.id}.mp3`);

            if (state.pointsAlreadyVisited[point.id]) visit(point);
            if (!isChapterAlreadyVisible(state, point.chapter, 0)){
                // hide it.
                point.marker.setStyle({opacity: 0, fillOpacity: 0});
            }

        }
        catch (e) {
            toastr.error('Point Error: ' + e + '\n' + point.id);
        }
    });

    // Load chapter ambients. It's language agnostic.
    Object.keys(chapters).map(function (chapterKey) {
        chapters[chapterKey].sound = new Audio(`sounds/chapters/${chapterKey}.mp3`);
        chapters[chapterKey].sound.loop = true;
    });

    startTrackingMe();
}

function isChapterAlreadyVisible(state, chapter, plus) {
    var index = getMaxChapterIndex(state);
    return Object.keys(chapters).indexOf(chapter) <= index + plus;
}

function getMaxChapterIndex(state){
    var indexOfMaxChapter = 0; // chapters[Object.keys(chapters)[0]];
    Object.keys(state.pointsAlreadyVisited).map(function (key) {
        if (Object.keys(chapters).indexOf(points[key].chapter) > indexOfMaxChapter) {
            indexOfMaxChapter = Object.keys(chapters).indexOf(points[key].chapter);
        }
    });
    return indexOfMaxChapter;
}

function visit(point) {
    point.marker.setStyle({ weight: '0px' });
}


function debug() {

    var point0 = points['A12']

    // Move a bit from where it is.
    point0.lat += 0.0006

    player.setLatLng([point0.lat, point0.lng]);

    addHandler(player);

    function addHandler(circle) {
        circle.on('mousedown', function (event) {
            //L.DomEvent.stop(event);
            map.dragging.disable();
            let { lat: circleStartingLat, lng: circleStartingLng } = circle._latlng;
            let { lat: mouseStartingLat, lng: mouseStartingLng } = event.latlng;

            map.on('mousemove', event => {
                let { lat: mouseNewLat, lng: mouseNewLng } = event.latlng;
                let latDifference = mouseStartingLat - mouseNewLat;
                let lngDifference = mouseStartingLng - mouseNewLng;

                let center = [circleStartingLat - latDifference, circleStartingLng - lngDifference];
                circle.setLatLng(center);
            });
        });

        map.on('mouseup', () => {
            map.dragging.enable();
            map.removeEventListener('mousemove');
        });
    }

    // Fake location service, that sends the circle's position to the handler.
    setInterval(function () {
        updateState({ latlng: player.getLatLng(), accuracy: 10 });
    }, 1000)

}


onLoad();