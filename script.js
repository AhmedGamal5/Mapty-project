'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // arr [long,lat]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // step/min
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/hr
    return this.speed;
  }
}

//App Architecture
class App {
  #map;
  #clickEvent;
  #workouts = [];
  constructor() {
    //get users position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    //handle Events
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // geolocation api
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Coud not get your location');
      }
    );
  }

  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    this.#map = L.map('map').setView([latitude, longitude], 15);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker([latitude, longitude]).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(clickE) {
    // console.log(clickE);
    this.#clickEvent = clickE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField(e) {
    e.preventDefault();
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const postiveInput = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();

    // Get data from form
    this.type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#clickEvent.latlng;
    // console.log(lat, lng)
    let newWorkout;

    // if workout running create new running object
    if (this.type === 'running') {
      const cadence = +inputCadence.value;
      // check validity of data
      if (
        !validInput(distance, duration, cadence) ||
        !postiveInput(distance, duration, cadence)
      ) {
        return alert('please enter a positive number');
      }
      newWorkout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout cycling create new cycle object
    if (this.type === 'cycling') {
      const elevation = +inputElevation.value;
      // check validity of data
      if (
        !validInput(distance, duration, elevation) ||
        !postiveInput(distance, duration)
      ) {
        return alert('please enter a positive number');
      }
      newWorkout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout Array
    this.#workouts.push(newWorkout);

    // Render the workout on map marker
    this._renderWorkoutMarker(newWorkout);

    // Render the workout on list
    this._renderWorkoutList(newWorkout);
    // Hide form + clear input data
    this._hideForm();
    //store data in local storage
    this._setLocalStorage();
  }
  _renderWorkoutMarker(newWorkout) {
    L.marker(newWorkout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${newWorkout.type}-popup`,
        })
      )
      .setPopupContent(
        `${newWorkout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
          newWorkout.description
        }`
      )
      .openPopup();
  }
  _renderWorkoutList(newWorkout) {
    let html = `<li class="workout workout--${newWorkout.type}" data-id=${
      newWorkout.id
    }>
    <h2 class="workout__title">${newWorkout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        newWorkout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${newWorkout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${newWorkout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    newWorkout.type === 'running'
      ? (html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${newWorkout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${newWorkout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`)
      : (html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${newWorkout.speed.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${newWorkout.elevationGain}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`);
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return; // Do nothing if the clicked element is not a workout
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    if (!workout) return; // Do nothing if the workout corresponding to the clicked element is not found
    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkoutList(work));
  }
  //Reset local storage and app but from console.log type: app.reset()
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
