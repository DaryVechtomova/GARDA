import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaTrash } from 'react-icons/fa';

const Edit = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [images, setImages] = useState([]); // Нові зображення
    const [existingImages, setExistingImages] = useState([]); // Існуючі зображення
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
    const [sizes, setSizes] = useState([]); // Розміри та кількість

    // Отримання даних товару
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`${url}/api/product/edit-product/${id}`);
                if (response.data.success) {
                    setData(response.data.data);
                    setExistingImages(response.data.data.images || []);
                    setSizes(response.data.data.sizes || []);
                } else {
                    toast.error("Помилка завантаження товару");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
                console.error("Помилка:", error);
            }
        };
        fetchProduct();
    }, [id]);

    // Обробка зміни файлів
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages((prev) => [...prev, ...files]);
    };

    // Видалення існуючого зображення
    const removeExistingImage = (imageToRemove) => {
        setExistingImages(existingImages.filter(image => image !== imageToRemove));
    };

    // Видалення нового зображення
    const removeNewImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    // Обробка зміни полів
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();

        const formData = new FormData();
        formData.append("id", id);
        Object.keys(data).forEach(key => formData.append(key, data[key]));

        // Додаємо нові зображення
        images.forEach((image) => {
            formData.append("images", image);
        });

        // Передаємо список залишених існуючих зображень
        formData.append("existingImages", JSON.stringify(existingImages));

        try {
            const response = await axios.post(`${url}/api/product/edit-product`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data.success) {
                toast.success(response.data.message);
                navigate("/list-product");
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Не вдалося оновити товар");
            console.error("Помилка:", error.response ? error.response.data : error.message);
        }
    };


    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Редагування товару</h4>

                {/* Завантаження зображень */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Завантажити зображення</p>
                    <div className="flex gap-2 flex-wrap">
                        {/* Прев'ю існуючих зображень */}
                        {existingImages.map((image, index) => (
                            <div key={`existing-${index}`} className="relative">
                                <img
                                    src={`${url}/images/${image}`}
                                    alt={`product-${index}`}
                                    className="h-20 w-20 object-cover rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeExistingImage(image)}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}

                        {/* Прев'ю нових зображень */}
                        {images.map((image, index) => (
                            <div key={`new-${index}`} className="relative">
                                <img
                                    src={URL.createObjectURL(image)}
                                    alt={`preview-${index}`}
                                    className="h-20 w-20 object-cover rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeNewImage(index)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <input
                        onChange={handleImageChange}
                        type="file"
                        id="images"
                        multiple
                        hidden
                    />
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
                    <input onChange={onChangeHandler} value={data.name} name="name" type="text" className="ring-1 ring-slate-900/10 py-1 px-3 outline-none" />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Опис</p>
                    <textarea onChange={onChangeHandler} value={data.description} name="description" rows={4} className="ring-1 ring-slate-900/10 py-1 px-3 outline-none resize-none"></textarea>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Ціна</p>
                    <input onChange={onChangeHandler} value={data.price} type="number" name="price" className="ring-1 ring-slate-900/10 py-1 px-3 outline-none" />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Категорія</p>
                    <select onChange={onChangeHandler} value={data.category} name="category" className="outline-none ring-1 ring-slate-900/10 py-1">
                        <option value="Оберіть категорію">Оберіть категорію</option>
                        <option value="Для жінок">Для жінок</option>
                        <option value="Для чоловіків">Для чоловіків</option>
                        <option value="Аксесуари">Аксесуари</option>
                    </select>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Нитки</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.threads}
                        type="text"
                        name="threads"
                        placeholder='Введіть нитки..'
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
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                {/* Блок для розмірів та кількості (тільки для перегляду) */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Розміри та кількість</p>
                    {sizes.map((size, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={size.size}
                                readOnly
                                className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100"
                            />
                            <input
                                type="number"
                                value={size.quantity}
                                readOnly
                                className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100"
                            />
                        </div>
                    ))}
                </div>

                {/* Кнопка збереження змін */}
                <button type='submit' className="btn-dark sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaSave />
                    Зберегти зміни
                </button>
            </form>
        </section>
    );
};

export default Edit;