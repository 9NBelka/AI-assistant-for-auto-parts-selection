import { useState, useMemo } from 'react';
import vehicles from '../../info/cars.json';
import { getCarDiagnosisPrompt } from '../../prompts/carDiagnosisPrompt';
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
  const [fullResult, setFullResult] = useState(null); // ← теперь только один стейт!

  /* ---- ФИЛЬТРЫ ---- */
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

  /* ---- ОТПРАВКА ---- */
  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !problem.trim()) {
      alert('Потрібно заповнити всі поля!');
      return;
    }

    setLoading(true);
    setFullResult(null);

    const prompt = getCarDiagnosisPrompt({
      brand: selectedBrand,
      model: selectedModel,
      year: selectedYear,
      problem: problem.trim(),
    });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 1800,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI ${response.status}: ${err}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();

      content = content
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      let result;
      try {
        result = JSON.parse(content);
      } catch (e) {
        console.error('Не вдалося розпарити JSON:', content);
        alert('ІІ повернула некоректну відповідь. Спробуй ще раз.');
        return;
      }

      setFullResult(result); // ← сохраняем весь объект целиком
    } catch (e) {
      console.error('Помилка:', e);
      alert('Не вдалося зв`язатися із ІІ. Перевір інтернет та ключ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formAndResultRow}>
        <div className={styles.formBlock}>
          {/* === ПОЛЯ ВВОДА (без изменений) === */}
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

          <div className={styles.field}>
            <label className={styles.label}>Опис проблеми</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder='Например: машина не заводится, стартер крутит, но не схватывает...'
              className={styles.textarea}
              rows={5}
            />
          </div>

          <button onClick={handleSubmit} className={styles.submitButton} disabled={loading}>
            {loading ? 'Анализируем...' : 'Получить диагностику и запчасти'}
          </button>
        </div>

        {/* === РЕЗУЛЬТАТ === */}
        {fullResult && (
          <div className={styles.result}>
            {fullResult.final_recommendation && (
              <div className={styles.finalRecommendation}>
                <strong>Моя головна порада:</strong> {fullResult.final_recommendation}
              </div>
            )}

            <h2>Що трапилося з машиною</h2>
            <div className={styles.diagnosisBlock}>
              <strong>Діагноз:</strong> {fullResult.diagnosis}
            </div>

            {fullResult.detailed_explanation && (
              <div className={styles.detailedExplanation}>
                <p>{fullResult.detailed_explanation}</p>
              </div>
            )}

            {fullResult.warning && (
              <div className={styles.warning}>Увага: {fullResult.warning}</div>
            )}

            {fullResult.symptoms_confirmation?.length > 0 && (
              <>
                <h3>Це точно ваша проблема, якщо:</h3>
                <ul className={styles.symptomsList}>
                  {fullResult.symptoms_confirmation.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            {fullResult.recommended_actions?.length > 0 && (
              <>
                <h3>Що робити прямо зараз:</h3>
                <ol className={styles.actionsList}>
                  {fullResult.recommended_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </>
            )}

            <h3>Рекомендовані запчастини (імовірно):</h3>
            <div className={styles.partsGrid}>
              {fullResult.parts
                ?.sort((a, b) => (b.probability || 0) - (a.probability || 0))
                .map((part, i) => (
                  <div key={i} className={styles.partCard}>
                    <div className={styles.partTitle}>
                      <h4>{part.name}</h4>
                      <div className={styles.badges}>
                        <span className={styles.probabilityBadge}>{part.probability}%</span>
                        {part.is_best_choice && (
                          <span className={styles.bestChoiceBadge}>КРАЩИЙ ВИБІР</span>
                        )}
                      </div>
                    </div>

                    {part.oem && <div className={styles.oem}>OEM: {part.oem}</div>}
                    {part.is_best_choice && part.why_best && (
                      <div className={styles.whyBest}>Чому рекомендую: {part.why_best}</div>
                    )}
                    <div className={styles.rating}>★ {part.rating?.toFixed(1)}</div>

                    <div className={styles.shops}>
                      {part.shops
                        ?.sort((a, b) => a.price - b.price)
                        .map((shop, idx) => (
                          <div
                            key={idx}
                            className={`${styles.shopRow} ${
                              !shop.in_stock ? styles.outOfStock : ''
                            }`}>
                            <div className={styles.shopName}>{shop.name}</div>
                            <div className={styles.shopPrice}>{shop.price} ₴</div>
                            {/* {shop.link ? (
                              <a
                                href={shop.link}
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.shopLink}>
                                {shop.in_stock ? 'Купить' : 'Под заказ'}
                              </a>
                            ) : (
                              <span>—</span>
                            )} */}
                            <small className={styles.delivery}>доставка: {shop.delivery}</small>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
