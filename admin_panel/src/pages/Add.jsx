import React, { useState } from 'react';
import upload_area from "../assets/upload_area1.svg";
import { FaPlus } from 'react-icons/fa6';
import axios from "axios";
import { toast } from 'react-toastify';

const Add = () => {
    const url = "http://localhost:4000";
    const [images, setImages] = useState([]); // Стан для зберігання декількох зображень
    const [data, setData] = useState({
        name: "",
        description: "",
        price: "",
        category: "Для жінок",
        threads: "",
        cut: "",
        technique: "",
        fabric: "",
        colors: "",
    });
    const [sizes, setSizes] = useState([{ size: "", quantity: "" }]); // Стан для зберігання розмірів та кількості

    const sizesList = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setData(data => ({ ...data, [name]: value }));
    };

    // Обробник зміни розмірів та кількості
    const handleSizeChange = (index, event) => {
        const { name, value } = event.target;
        const newSizes = [...sizes];
        newSizes[index][name] = value;
        setSizes(newSizes);
    };

    // Обробник зміни розміру (для випадаючого списку)
    const handleSizeSelectChange = (index, event) => {
        const value = event.target.value;
        const newSizes = [...sizes];
        newSizes[index].size = value;
        setSizes(newSizes);
    };

    // Додавання нового поля для розміру
    const addSizeField = () => {
        setSizes([...sizes, { size: "", quantity: "" }]);
    };

    // Видалення поля для розміру
    const removeSizeField = (index) => {
        const newSizes = sizes.filter((_, i) => i !== index);
        setSizes(newSizes);
    };

    // Обробник завантаження зображень
    const handleImageChange = (event) => {
        const files = Array.from(event.target.files); // Перетворюємо FileList у масив
        setImages((prevImages) => [...prevImages, ...files]); // Додаємо нові зображення до існуючих
    };

    // Видалення зображення зі списку
    const removeImage = (index) => {
        setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const formData = new FormData();

        // Додаємо текстові дані до FormData
        formData.append("name", data.name);
        formData.append("description", data.description);
        formData.append("price", Number(data.price));
        formData.append("category", data.category);
        formData.append("threads", data.threads);
        formData.append("cut", data.cut);
        formData.append("technique", data.technique);
        formData.append("fabric", data.fabric);
        formData.append("colors", data.colors);

        // Додаємо розміри та кількість
        sizes.forEach((size, index) => {
            formData.append(`sizes[${index}][size]`, size.size);
            formData.append(`sizes[${index}][quantity]`, size.quantity);
        });

        // Додаємо кожне зображення до FormData
        images.forEach((image) => {
            formData.append("images", image); // "images" - ключ для масиву зображень
        });

        try {
            const response = await axios.post(`${url}/api/product/add`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            if (response.data.success) {
                setData({
                    name: "",
                    description: "",
                    price: "",
                    category: "Для жінок",
                    threads: "",
                    cut: "",
                    technique: "",
                    fabric: "",
                    colors: "",
                });
                setSizes([{ size: "", quantity: "" }]); // Очищаємо розміри
                setImages([]); // Очищаємо масив зображень
                toast.success(response.data.message);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Не вдалося додати товар");
            console.error("Помилка:", error);
        }
    };

    return (
        <section className="p-4 sm:p-10 w-full bg-primary/20 ">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Додавання товару</h4>

                {/* Блок для завантаження зображень */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Завантажити зображення</p>
                    <div className="flex gap-2 flex-wrap">
                        {/* Відображення прев'ю завантажених зображень */}
                        {images.map((image, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={URL.createObjectURL(image)}
                                    alt={`preview-${index}`}
                                    className="h-20 w-20 object-cover rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        {/* Плейсхолдер для завантаження нових зображень */}
                        {images.length === 0 && (
                            <img src={upload_area} alt="upload" className="h-20 w-20 object-cover rounded-lg shadow-sm" />
                        )}
                    </div>

                    {/* Приховане поле для вибору файлів */}
                    <input
                        onChange={handleImageChange}
                        type="file"
                        id="images"
                        multiple
                        hidden
                    />

                    {/* Кнопка для відкриття вибору файлів */}
                    <button
                        type="button"
                        onClick={() => document.getElementById('images').click()}
                        className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition mt-2"
                    >
                        Обрати зображення
                    </button>
                </div>

                {/* Поля форми */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Назва</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.name}
                        name="name"
                        type="text"
                        placeholder='Введіть назву..'
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Про товар</p>
                    <textarea
                        onChange={onChangeHandler}
                        value={data.description}
                        name="description"
                        placeholder='Введіть опис..'
                        rows={6}
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none resize-none"
                    ></textarea>
                </div>

                <div className="flex items-center gap-x-6 text-gray-900/70 medium-15">
                    <div className="flex flex-col gap-y-2">
                        <p className='text-base'>Категорія</p>
                        <select
                            onChange={onChangeHandler}
                            value={data.category}
                            name="category"
                            className="outline-none ring-1 ring-slate-900/10 py-1"
                        >
                            <option value="Оберіть категорію">Оберіть категорію</option>
                            <option value="Для жінок">Для жінок</option>
                            <option value="Для чоловіків">Для чоловіків</option>
                            <option value="Аксесуари">Аксесуари</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Ціна</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.price}
                        type="number"
                        name="price"
                        placeholder='Ввведіть ціну..'
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Нитки</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.threads}
                        type="text"
                        name="threads"
                        placeholder='Введіть нитки..'
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Крій</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.cut}
                        type="text"
                        name="cut"
                        placeholder='Введіть тип крою..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Техніка виконання</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.technique}
                        type="text"
                        name="technique"
                        placeholder='Введіть техніку виконання..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Тканина</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.fabric}
                        type="text"
                        name="fabric"
                        placeholder='Ввведіть тканину..'
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Колір</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.colors}
                        type="text"
                        name="colors"
                        placeholder='Введіть колір..'
                        required
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                {/* Блок для розмірів та кількості */}
                <div className="flex items-center gap-x-6 text-gray-900/70 medium-15">
                    <div className="flex flex-col gap-y-2">
                        <p className='text-base'>Розміри та кількість</p>
                        {sizes.map((size, index) => (
                            <div key={index} className="flex gap-2">
                                <select
                                    value={size.size}
                                    onChange={(e) => handleSizeSelectChange(index, e)}
                                    className="ring-1 ring-slate-900/10 py-1 outline-none"
                                >
                                    <option value="">Оберіть розмір</option>
                                    {sizesList.map((sizeOption, i) => (
                                        <option key={i} value={sizeOption}>
                                            {sizeOption}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    name="quantity"
                                    placeholder="Кількість"
                                    value={size.quantity}
                                    onChange={(e) => handleSizeChange(index, e)}
                                    className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeSizeField(index)}
                                    className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addSizeField}
                            className="px-4 btn-dark font-bold shadow-md transition mt-2 sm:w-5-12 flexCenter gap-x-2 !py-2 rounded"
                        >
                            Додати розмір
                        </button>
                    </div>
                </div>

                {/* Кнопка додавання товару */}
                <button type='submit' className=" bg-[#fbb42c] hover:bg-[#d0882a] font-bold text-black sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaPlus />
                    Додати товар
                </button>
            </form>
        </section>
    );
};

export default Add;