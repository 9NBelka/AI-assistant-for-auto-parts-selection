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
  const [loading, setLoading] = useState(false);

  // Новые состояния для результата
  const [diagnosis, setDiagnosis] = useState('');
  const [actions, setActions] = useState([]);
  const [warning, setWarning] = useState('');
  const [recommendedParts, setRecommendedParts] = useState([]);

  /* ---- ФИЛЬТРЫ (без изменений) ---- */
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

  /* ---- ОТПРАВКА В OPENAI ---- */
  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !problem) {
      alert('Заполни все поля!');
      return;
    }

    setLoading(true);
    setDiagnosis('');
    setActions([]);
    setWarning('');
    setRecommendedParts([]);

    const prompt = `
Ты — профессиональный автомеханик и эксперт по подбору запчастей.

Автомобиль:
- Марка: ${selectedBrand}
- Модель: ${selectedModel}
- Год выпуска: ${selectedYear}
- Проблема: "${problem}"

Верни ОДИН валидный JSON-объект (без \`\`\`json и лишнего текста!) строго в этом формате:

{
  "diagnosis": "Краткое описание вероятной неисправности (1-2 предложения)",
  "recommended_actions": ["Шаг 1", "Шаг 2", "Шаг 3"],
  "parts": [
    {
      "name": "Название запчасти",
      "oem": "Оригинальный номер (если знаешь)",
      "price_min": 450,
      "price_avg": 620,
      "rating": 4.8,
      "probability": 85,
      "link": "https://exist.ua/..."
    }
  ],
  "warning": "Важное предупреждение или null"
}

Правила:
- Только чистый JSON!
- Цены в гривнах (₴)
- probability — от 10 до 95 (%)
- rating от 1.0 до 5.0
- Если не уверен в артикуле — оставь пустую строку или "аналог"
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // быстрее и дешевле, чем gpt-4
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI ${response.status}: ${err}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();

      // Убираем возможные ```json
      content = content
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('Не удалось распарсить JSON от ИИ:', content);
        alert('ИИ вернул некорректный ответ. Попробуй ещё раз или перефразируй проблему.');
        return;
      }

      setDiagnosis(result.diagnosis || 'Не удалось определить причину');
      setActions(result.recommended_actions || []);
      setWarning(result.warning || '');
      setRecommendedParts(result.parts || []);
    } catch (e) {
      console.error('Ошибка OpenAI:', e);
      alert('Не удалось связаться с ИИ. Проверь интернет или ключ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* === ВЫБОР МАРКИ === */}
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
          {searchBrand && !selectedBrand && filteredBrands.length > 0 && (
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
        {selectedBrand && <div className={styles.selected}>Выбрано: {selectedBrand}</div>}
      </div>

      {/* === МОДЕЛЬ === */}
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
          {searchModel && !selectedModel && filteredModels.length > 0 && (
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
        {selectedModel && <div className={styles.selected}>Выбрано: {selectedModel}</div>}
      </div>

      {/* === ГОД === */}
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
          {searchYear && !selectedYear && filteredYears.length > 0 && (
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
        {selectedYear && <div className={styles.selected}>Выбрано: {selectedYear}</div>}
      </div>

      {/* === ОПИСАНИЕ ПРОБЛЕМЫ === */}
      <div className={styles.field}>
        <label className={styles.label}>Опис проблеми</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder='Например: машина троит на холодную, загорается check engine...'
          className={styles.textarea}
          rows={4}
        />
      </div>

      {/* === КНОПКА === */}
      <button onClick={handleSubmit} className={styles.submitButton} disabled={loading}>
        {loading ? 'Анализируем проблему...' : 'Подобрать запчасти и решение'}
      </button>

      {/* === РЕЗУЛЬТАТ === */}
      {diagnosis && (
        <div className={styles.result}>
          <h2>Результат диагностики</h2>

          <div className={styles.diagnosisBlock}>
            <strong>Вероятная причина:</strong> {diagnosis}
          </div>

          {warning && <div className={styles.warning}>Внимание: {warning}</div>}

          {actions.length > 0 && (
            <>
              <h3>Что делать:</h3>
              <ol className={styles.actionsList}>
                {actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ol>
            </>
          )}

          {recommendedParts.length > 0 && (
            <>
              <h3>Рекомендуемые запчасти:</h3>
              <div className={styles.partsGrid}>
                {recommendedParts
                  .sort((a, b) => (b.probability || 0) - (a.probability || 0))
                  .map((part, i) => (
                    <div key={i} className={styles.partCard}>
                      <div className={styles.partTitle}>
                        <h4>{part.name}</h4>
                        <span className={styles.probabilityBadge}>
                          {part.probability ? `${part.probability}%` : '—'}
                        </span>
                      </div>

                      {part.oem && <div className={styles.oem}>OEM: {part.oem}</div>}

                      <div className={styles.price}>
                        от <strong>{part.price_min} ₴</strong>
                        {part.price_avg && <> → ~{part.price_avg} ₴</>}
                      </div>

                      {part.rating && (
                        <div className={styles.rating}>★ {part.rating.toFixed(1)}</div>
                      )}

                      {part.link ? (
                        <a
                          href={part.link}
                          target='_blank'
                          rel='noopener noreferrer'
                          className={styles.buyLink}>
                          Купить →
                        </a>
                      ) : (
                        <small className={styles.noLink}>Ищи по названию</small>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
