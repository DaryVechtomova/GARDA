import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Define sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 1.5, 1.7);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('viewer').appendChild(renderer.domElement);

// Освітлення
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
// scene.add(ambientLight);

// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
// directionalLight.position.set(5, 10, 5);
// scene.add(directionalLight);
// Зміна кольору фону сцени
scene.background = new THREE.Color(0xC1D6E4); // Світло-сірий фон

// Освітлення
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // М'яке загальне освітлення
scene.add(ambientLight);

// Основне направлене світло
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true; // Додаємо тіні для більшої реалістичності
scene.add(directionalLight);

// Додаткове направлене світло з іншого боку для заповнення тіней
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight2.position.set(-5, 10, -5);
scene.add(directionalLight2);

// Підсвітка ззаду для підкреслення контурів
const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(0, 5, -5);
scene.add(backLight);

// Підсвітка зверху для більшої деталізації
const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
topLight.position.set(0, 10, 0);
scene.add(topLight);

// SpotLight для акцентування на обличчі або певних частинах тіла
const spotLight = new THREE.SpotLight(0xffffff, 1, 10, Math.PI / 6, 0.5);
spotLight.position.set(0, 3, 2);
spotLight.castShadow = true;
scene.add(spotLight);

// // Додаємо хелпери для візуалізації джерел світла (опціонально)
// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
// scene.add(directionalLightHelper);

// const spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);

// Додаємо світло спереду (PointLight)
const frontLight = new THREE.PointLight(0xffffff, 1, 10); // Колір, інтенсивність, відстань
frontLight.position.set(0, 1.25, 1.3); // Позиція світла: перед жінкою, трохи вище рівня очей
scene.add(frontLight);

// // Додаємо хелпер для візуалізації світла (опціонально)
// const frontLightHelper = new THREE.PointLightHelper(frontLight, 0.5);
// scene.add(frontLightHelper);

// Додаємо світло спереду (PointLight)
const back1Light = new THREE.PointLight(0xffffff, 1, 10); // Колір, інтенсивність, відстань
back1Light.position.set(0, 1.25, -1);
scene.add(back1Light);

// // Додаємо хелпер для візуалізації світла (опціонально)
// const back1LightHelper = new THREE.PointLightHelper(back1Light, 0.5);
// scene.add(back1LightHelper);

// Завантаження моделей
const loader = new GLTFLoader();
let hero = null;
loader.load('/static/models/woman_15.gltf', (gltf) => {
    hero = gltf.scene;
    hero.position.set(0, 0, 0);
    scene.add(hero);
    // Додаємо код для перевірки розміру моделі
    const modelSize = getModelSize(hero); // Розміри моделі
    const modelCenter = getModelCenter(hero); // Центр моделі

    console.log('Розміри моделі:', modelSize);
    console.log('Центр моделі:', modelCenter)
});


// Функція для отримання розмірів моделі
function getModelSize(model) {
    const box = new THREE.Box3().setFromObject(model); // Отримуємо обмежувальний прямокутник
    const size = new THREE.Vector3();
    box.getSize(size); // Отримуємо розміри моделі (ширина, висота, глибина)
    return size;
}

// Функція для отримання позиції центру моделі
function getModelCenter(model) {
    const box = new THREE.Box3().setFromObject(model); // Отримуємо обмежувальний прямокутник
    const center = new THREE.Vector3();
    box.getCenter(center); // Отримуємо центр моделі
    return center;
}

// Функція для оновлення шейпкейсу
function updateShapeKey(keyName, minValue, maxValue, currentValue) {
    if (!hero) {
        console.warn('Модель ще не завантажена');
        return;
    }
    hero.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
            if (keyName === 'CheeksMax') {
                // Для щік обробляємо лише один шейпкейс
                const keyIndex = child.morphTargetDictionary[keyName];
                if (keyIndex !== undefined) {
                    child.morphTargetInfluences[keyIndex] = currentValue; // Діапазон [0, 1]
                }
            } else {
                // Для інших шейпкейсов з Min і Max
                const keyIndexMin = child.morphTargetDictionary[`${keyName}Min`];
                const keyIndexMax = child.morphTargetDictionary[`${keyName}Max`];
                if (keyIndexMin !== undefined) {
                    child.morphTargetInfluences[keyIndexMin] =
                        Math.max(0, (maxValue - currentValue) / (maxValue - minValue));
                }
                if (keyIndexMax !== undefined) {
                    child.morphTargetInfluences[keyIndexMax] =
                        Math.max(0, (currentValue - minValue) / (maxValue - minValue));
                }
            }
        }
    });
}

// Отримуємо елементи введення та відображення значень
const controls = {
    waistWidth: {
        input: document.getElementById('waistWidthInput'),
        valueDisplay: document.getElementById('waistWidthValue'),
    },
    chestWidth: {
        input: document.getElementById('chestWidthInput'),
        valueDisplay: document.getElementById('chestWidthValue'),
    },
    hipsWidth: {
        input: document.getElementById('hipsWidthInput'),
        valueDisplay: document.getElementById('hipsWidthValue'),
    },
    thighWidth: {
        input: document.getElementById('thighWidthInput'),
        valueDisplay: document.getElementById('thighWidthValue'),
    },
    calfWidth: {
        input: document.getElementById('calfWidthInput'),
        valueDisplay: document.getElementById('calfWidthValue'),
    },
    waistToCrotchLength: {
        input: document.getElementById('waistToCrotchLengthInput'),
        valueDisplay: document.getElementById('waistToCrotchLengthValue'),
    },
    thighLength: {
        input: document.getElementById('thighLengthInput'),
        valueDisplay: document.getElementById('thighLengthValue'),
    },
    calfLength: {
        input: document.getElementById('calfLengthInput'),
        valueDisplay: document.getElementById('calfLengthValue'),
    },
    armLength: {
        input: document.getElementById('armLengthInput'),
        valueDisplay: document.getElementById('armLengthValue'),
    },
    armWidth: {
        input: document.getElementById('armWidthInput'),
        valueDisplay: document.getElementById('armWidthValue'),
    },
    neckWidth: {
        input: document.getElementById('neckWidthInput'),
        valueDisplay: document.getElementById('neckWidthValue'),
    },
    neckToWaistLength: {
        input: document.getElementById('neckToWaistLengthInput'),
        valueDisplay: document.getElementById('neckToWaistLengthValue'),
    },
    cheeksWidth: {
        input: document.getElementById('cheeksWidthInput'),
        valueDisplay: document.getElementById('cheeksWidthValue'),
    },
};

// Функція для оновлення значень та шейпкейсу
Object.keys(controls).forEach((key) => {
    const control = controls[key];

    // Слухаємо подію вводу (input)
    control.input.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);

        // Оновлюємо текстове відображення
        control.valueDisplay.textContent = value;

        // Оновлюємо шейпкейси
        switch (key) {
            case 'waistWidth':
                updateShapeKey('WaistWidth', 50, 110, value);
                break;
            case 'chestWidth':
                updateShapeKey('ChestWidth', 50, 120, value);
                break;
            case 'hipsWidth':
                updateShapeKey('HipsWidth', 70, 140, value);
                break;
            case 'thighWidth':
                updateShapeKey('ThighWidth', 40, 90, value);
                break;
            case 'calfWidth':
                updateShapeKey('CalfWidth', 20, 50, value);
                break;
            case 'waistToCrotchLength':
                updateShapeKey('WaistToCrotchLength', 25, 40, value);
                break;
            case 'thighLength':
                updateShapeKey('ThighLength', 20, 60, value);
                break;
            case 'calfLength':
                updateShapeKey('CalfLength', 30, 70, value);
                break;
            case 'armLength':
                updateShapeKey('ArmLength', 45, 80, value);
                break;
            case 'armWidth':
                updateShapeKey('ArmWidth', 20, 50, value);
                break;
            case 'neckWidth':
                updateShapeKey('NeckWidth', 25, 45, value);
                break;
            case 'neckToWaistLength':
                updateShapeKey('NeckToWaistLength', 25, 50, value);
                break;
            case 'cheeksWidth':
                updateShapeKey('CheeksMax', 0, 1, value); // Для діапазону [0, 1]
                break;
        }
    });
});

// Контролери камери
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 1, 0);

// Анімаційний цикл
const animate = () => {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
};

animate();

// Ресайз
window.addEventListener('resize', () => {
    sizes.width = document.getElementById('viewer').clientWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

//Вишиванка загрузка
// Функція для знаходження найближчого розміру

function getClosestSize(waist, chest, hips) {
    const waistSizes = [60, 70, 90, 110];
    const chestSizes = [70, 90, 110];
    const hipsSizes = [80, 100, 120];

    // Сортуємо масиви за зростанням
    waistSizes.sort((a, b) => a - b);
    chestSizes.sort((a, b) => a - b);
    hipsSizes.sort((a, b) => a - b);

    // Функція для знаходження найближчого значення
    const findClosest = (sizes, value) => {
        for (let i = 0; i < sizes.length; i++) {
            if (sizes[i] >= value) {
                return sizes[i];
            }
        }
        return sizes[sizes.length - 1];  // Якщо значення більше за всі розміри, повертаємо найбільший
    };

    const closestWaist = findClosest(waistSizes, waist);
    const closestChest = findClosest(chestSizes, chest);
    const closestHips = findClosest(hipsSizes, hips);

    return `W${closestWaist}C${closestChest}H${closestHips}`;
}


// Змінна для зберігання поточної вишиванки
let currentShirt = null;

// Функція для оновлення позиції вишиванки
function updateShirtPosition() {
    if (!currentShirt || !hero) return;

    // Отримуємо значення шейпкейсів для ніг
    const calfLength = parseFloat(controls.calfLength.input.value);
    const thighLength = parseFloat(controls.thighLength.input.value);

    const calf = calfLength;
    const thigh = thighLength;


    // Загальна зміна висоти (у відсотках від базового зросту 162см)
    const totalHeightChange = (calf - 45 + thigh - 27) * 0.01; // Середнє значення

    // Оновлюємо позицію вишиванки
    currentShirt.position.y = totalHeightChange; // Налаштуйте коефіцієнт для потрібного ефекту
}

// Функція для завантаження вишиванки
function loadShirt(waist, chest, hips, armLength, neckToWaistLength, waistToCrotchLength) {
    // Видаляємо попередню вишиванку, якщо вона існує
    if (currentShirt) {
        scene.remove(currentShirt);
        currentShirt = null;
    }

    const shirtSize = getClosestSize(waist, chest, hips);
    const shirtPath = `/static/models/cloth_L/${shirtSize}.gltf`;

    loader.load(shirtPath, (gltf) => {
        const shirt = gltf.scene;
        shirt.position.set(0, 0, 0);
        scene.add(shirt);

        // Зберігаємо поточну вишиванку
        currentShirt = shirt;

        // Застосування шейпкейсів
        shirt.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                const bodyMax = child.morphTargetDictionary[`${shirtSize}_body_max`];
                const bodyMin = child.morphTargetDictionary[`${shirtSize}_body_min`];
                const armMax = child.morphTargetDictionary[`${shirtSize}_AL_max`];
                const armMin = child.morphTargetDictionary[`${shirtSize}_AL_min`];

                // Обчислення значень для шейпкейсів тіла
                if (bodyMax !== undefined && bodyMin !== undefined) {
                    // Сума значень для "WaistToCrotchLength" та "NeckToWaistLength"
                    const totalBodyValue = (waistToCrotchLength + neckToWaistLength);

                    // Діапазон для максимального шейпкейсу: від 66 (33 + 33) до 90 (40 + 50)
                    const maxBodyRange = { min: 66, max: 90 };
                    // Діапазон для мінімального шейпкейсу: від 50 (25 + 25) до 66 (33 + 33)
                    const minBodyRange = { min: 50, max: 66 };

                    if (totalBodyValue >= maxBodyRange.min && totalBodyValue <= maxBodyRange.max) {
                        // Нормалізація для максимального шейпкейсу
                        const bodyMaxValue = (totalBodyValue - maxBodyRange.min) / (maxBodyRange.max - maxBodyRange.min);
                        child.morphTargetInfluences[bodyMax] = bodyMaxValue; // Максимальний шейпкейс
                        child.morphTargetInfluences[bodyMin] = 0; // Мінімальний шейпкейс = 0
                    } else if (totalBodyValue >= minBodyRange.min && totalBodyValue <= minBodyRange.max) {
                        // Нормалізація для мінімального шейпкейсу
                        const bodyMinValue = (totalBodyValue - minBodyRange.min) / (minBodyRange.max - minBodyRange.min);
                        child.morphTargetInfluences[bodyMin] = 1 - bodyMinValue; // Мінімальний шейпкейс
                        child.morphTargetInfluences[bodyMax] = 0; // Максимальний шейпкейс = 0
                    } else {
                        // Якщо значення поза діапазоном, використовується найближчий шейпкейс
                        if (totalBodyValue < minBodyRange.min) {
                            child.morphTargetInfluences[bodyMin] = 1; // Мінімальний шейпкейс
                            child.morphTargetInfluences[bodyMax] = 0; // Максимальний шейпкейс = 0
                        } else if (totalBodyValue > maxBodyRange.max) {
                            child.morphTargetInfluences[bodyMax] = 1; // Максимальний шейпкейс
                            child.morphTargetInfluences[bodyMin] = 0; // Мінімальний шейпкейс = 0
                        }
                    }
                }

                // Обчислення значень для шейпкейсів рук
                if (armMax !== undefined && armMin !== undefined) {
                    // Діапазон для "ArmLength": від 45 до 70+ см
                    const armMaxRange = { min: 56, max: 70 }; // Діапазон для _AL_max
                    const armMinRange = { min: 56, max: 45 }; // Діапазон для _AL_min

                    if (armLength > armMaxRange.min) {
                        // Якщо довжина руки >= 56 см, обчислюємо значення для _AL_max
                        const armMaxValue = (armLength - armMaxRange.min) / (armMaxRange.max - armMaxRange.min);
                        child.morphTargetInfluences[armMax] = Math.min(1, armMaxValue); // Максимальний шейпкейс
                        child.morphTargetInfluences[armMin] = 0; // Мінімальний шейпкейс = 0
                    } else if (armLength < armMinRange.min) {
                        // Якщо довжина руки <= 56 см, обчислюємо значення для _AL_min
                        const armMinValue = (armLength - armMinRange.max) / (armMinRange.min - armMinRange.max);
                        child.morphTargetInfluences[armMin] = 1 - (armMinValue * (-1)); // Мінімальний шейпкейс
                        child.morphTargetInfluences[armMax] = 0; // Максимальний шейпкейс = 0
                    }
                    else {
                        child.morphTargetInfluences[armMin] = 0; // Мінімальний шейпкейс
                        child.morphTargetInfluences[armMax] = 0; // Максимальний шейпкейс = 0
                    }
                }
            }
        });
        // Оновлюємо позицію вишиванки
        updateShirtPosition();
    });
}

// Додаємо обробник події для кнопки "одягти"
document.getElementById('dressButton').addEventListener('click', () => {
    const waist = parseFloat(controls.waistWidth.input.value);
    const chest = parseFloat(controls.chestWidth.input.value);
    const hips = parseFloat(controls.hipsWidth.input.value);
    const armLength = parseFloat(controls.armLength.input.value);
    const neckToWaistLength = parseFloat(controls.neckToWaistLength.input.value);
    const waistToCrotchLength = parseFloat(controls.waistToCrotchLength.input.value);

    loadShirt(waist, chest, hips, armLength, neckToWaistLength, waistToCrotchLength);
});
