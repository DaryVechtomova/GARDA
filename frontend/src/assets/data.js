import men from "../assets/products/men.png";
import women from "../assets/products/woman.png";
import accessories from "../assets/products/accessories.png";

// Імпорт зображень з папки uploads
import skirt_nova_kahovka_front from "../../../backend/uploads/1741204707044skirt_nova kahovka_front.jpg";
import skirt_nova_kahovka_side from "../../../backend/uploads/1741204707046skirt_nova kahovka_side.jpg";
import skirt_nova_kahovka_embroidering from "../../../backend/uploads/1741204707050skirt_nova kahovka_embroidering.jpg";

import yavir_front from "../../../backend/uploads/1741204707046skirt_nova kahovka_side.jpg";

import kyiv_rush_988_1 from "../../../backend/uploads/1741204707050skirt_nova kahovka_embroidering.jpg";
import kyiv_rush_988_2 from "../../../backend/uploads/1741204707044skirt_nova kahovka_front.jpg";
import kyiv_rush_988_3 from "../assets/products/accessories.png";

export const categories = [
    {
        name: "Для жінок",
        image: women,
    },
    {
        name: "Аксесуари",
        image: accessories,
    },
    {
        name: "Для чоловіків",
        image: men,
    },
];

export const all_products = [
    {
        _id: "67c8ace3de7ec961ba4b1344",
        name: "Лляна спідниця сірого кольору з білою вишивкою 'Нова Каховка'",
        description: "длвмлдвоипдвлопдвло",
        price: 7000,
        images: [
            skirt_nova_kahovka_front,
            skirt_nova_kahovka_side,
            skirt_nova_kahovka_embroidering,
        ],
        category: "Для жінок",
        threads: "Бавовна",
        cut: "Повнорозмірний",
        technique: "Гладь",
        fabric: "Льон",
        colors: "Сірий",
        sizes: [], // Додайте розміри, якщо вони є
        discount: 10,
    },
    {
        _id: "67cb4a7af4967d7149e9ff39",
        name: "Вишита лляна сорочка з яворівським орнаментом Yavir",
        description: "ттатаптвтвтаатвтавта",
        price: 9000,
        images: [yavir_front],
        category: "Для жінок",
        threads: "Бавовна",
        cut: "Оверсайз",
        technique: "Гладь",
        fabric: "Льон",
        colors: "Кремовий",
        sizes: [], // Додайте розміри, якщо вони є
        discount: 0,
    },
    {
        _id: "67d69e94f3e37ded18772670",
        name: "Чоловіча вишиванка з символами Київської Русі 988",
        description: "Пряма сорочка з коміром стійкою, спереду розріз з застібкою на кнопку.",
        price: 5400,
        images: [
            kyiv_rush_988_1,
            kyiv_rush_988_2,
            kyiv_rush_988_3,
        ],
        category: "Для чоловіків",
        threads: "Бавовна",
        cut: "",
        technique: "Гладь",
        fabric: "Льон",
        colors: "Зелений",
        sizes: [], // Додайте розміри, якщо вони є
        discount: 20,
    },
];