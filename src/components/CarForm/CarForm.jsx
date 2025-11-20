import { useState, useMemo } from 'react';
import vehicles from '../../info/cars.json';
import styles from './CarForm.module.scss';

export default function CarForm() {
  const brands = vehicles.data;

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchYear, setSearchYear] = useState('');

  const [problem, setProblem] = useState('');
  const [recommendedParts, setRecommendedParts] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---- ФИЛЬТР ---- */
  const filteredBrands = useMemo(
    () =>
      brands
        .map((b) => b.name)
        .filter((name) => name.toLowerCase().startsWith(searchBrand.toLowerCase())),
    [searchBrand, brands],
  );
  const filteredModels = useMemo(() => {
    if (!selectedBrand) return [];
    const brand = brands.find((b) => b.name === selectedBrand);
    return brand
      ? brand.models
          .map((m) => m.name)
          .filter((m) => m.toLowerCase().startsWith(searchModel.toLowerCase()))
      : [];
  }, [searchModel, selectedBrand, brands]);
  const filteredYears = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    const brand = brands.find((b) => b.name === selectedBrand);
    const model = brand?.models.find((m) => m.name === selectedModel);
    if (!model) return [];
    const years = [];
    for (let y = model.year_from; y <= model.year_to; y++) years.push(y);
    return years.filter((y) => y.toString().startsWith(searchYear));
  }, [searchYear, selectedBrand, selectedModel, brands]);

  /* ---- ОТПРАВКА ПРОБЛЕМЫ В AI ---- */
  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !problem) return;

    setLoading(true);
    setRecommendedParts([]);

    const prompt = `
Ты — эксперт по запчастям автомобилей.
Марка: ${selectedBrand}
Модель: ${selectedModel}
Год: ${selectedYear}
Проблема: ${problem}

Составь список запчастей, которые могут быть причиной этой проблемы, в виде массива JSON:
[
  {"part": "название детали"}
]
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const text = data.choices[0].message.content;

      // Пытаемся распарсить JSON
      let parts = [];
      try {
        parts = JSON.parse(text);
      } catch {
        console.log('Не удалось распарсить JSON, вернулось raw:', text);
      }

      setRecommendedParts(parts);
    } catch (e) {
      console.error(e);
      alert('Ошибка при подключении к OpenAI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* --- ВЫБОР МАРКИ --- */}
      <div className={styles.field}>
        <label className={styles.label}>Марка автомобіля</label>
        <input
          value={searchBrand}
          onChange={(e) => {
            setSearchBrand(e.target.value);
            setSelectedBrand(null);
            setSelectedModel(null);
            setSelectedYear(null);
          }}
          placeholder='Введи марку...'
          className={styles.input}
        />
        <div className={styles.dropdown}>
          {searchBrand && !selectedBrand && (
            <div className={styles['dropdown-list']}>
              {filteredBrands.map((b, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedBrand(b);
                    setSearchBrand(b);
                    setSelectedModel(null);
                    setSelectedYear(null);
                  }}
                  className={styles['dropdown-item']}>
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- МОДЕЛЬ --- */}
      <div className={styles.field}>
        <label className={styles.label}>Модель</label>
        <input
          value={searchModel}
          onChange={(e) => {
            setSearchModel(e.target.value);
            setSelectedModel(null);
            setSelectedYear(null);
          }}
          placeholder='Введи модель...'
          className={styles.input}
          disabled={!selectedBrand}
        />
        <div className={styles.dropdown}>
          {searchModel && !selectedModel && (
            <div className={styles['dropdown-list']}>
              {filteredModels.map((m, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedModel(m);
                    setSearchModel(m);
                    setSelectedYear(null);
                  }}
                  className={styles['dropdown-item']}>
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- ГОД --- */}
      <div className={styles.field}>
        <label className={styles.label}>Рік</label>
        <input
          value={searchYear}
          onChange={(e) => {
            setSearchYear(e.target.value);
            setSelectedYear(null);
          }}
          placeholder='Введи рік...'
          className={styles.input}
          disabled={!selectedModel}
        />
        <div className={styles.dropdown}>
          {searchYear && !selectedYear && (
            <div className={styles['dropdown-list']}>
              {filteredYears.map((y, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedYear(y);
                    setSearchYear(y.toString());
                  }}
                  className={styles['dropdown-item']}>
                  {y}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- ОПИСАНИЕ ПРОБЛЕМЫ --- */}
      <div className={styles.field}>
        <label className={styles.label}>Опис проблеми</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder='Опиши несправність...'
          className={styles.textarea}
        />
      </div>

      {/* --- КНОПКА ОТПРАВКИ --- */}
      <button onClick={handleSubmit} className={styles.submitButton} disabled={loading}>
        {loading ? 'Обработка...' : 'Подобрать запчасти'}
      </button>

      {/* --- ВЫВОД РЕЗУЛЬТАТА --- */}
      {recommendedParts.length > 0 && (
        <div className={styles.result}>
          <h3>Возможные запчасти:</h3>
          <ul>
            {recommendedParts.map((p, i) => (
              <li key={i}>{p.part}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
