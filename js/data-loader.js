/**
 * SavinTree Data Loader
 * Загружает базовые данные из data/people.json и мерджит с локальными правками.
 * Локальные правки хранятся в localStorage под ключом SavinTree_edits
 */

(function(){
  // ИСПРАВЛЕНО: раньше был абсолютный путь '/family-tree/data/people.json',
  // который работает только если сайт размещён ровно в подпапке /family-tree/.
  // Относительный путь работает независимо от того, где развёрнут сайт
  // (корень домена, GitHub Pages в подпапке репозитория и т.д.),
  // пока index.html и data/ лежат рядом.
  const DATA_URL = 'data/people.json';
  const EDITS_KEY = 'SavinTree_edits';

  window.SavinTreeData = (function(){
    /**
     * Загружает базовые данные из JSON и мерджит с локальными правками
     * @returns {Promise<Array>} Массив merged-людей
     */
    async function loadPeople(){
      let base = [];
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        base = await res.json();
      } catch (e) {
        console.error('Failed to load base data from data/people.json:', e);
        base = [];
      }

      // Загружаем локальные правки из localStorage
      const rawEdits = localStorage.getItem(EDITS_KEY) || '{}';
      let edits = {};
      try {
        edits = JSON.parse(rawEdits);
      } catch (err) {
        console.error('Failed to parse edits from localStorage:', err);
        edits = {};
      }

      // Мерджим базовые данные с правками: правки перекрывают base
      const merged = base.map(p => Object.assign({}, p, edits[p.id] || {}));

      // Добавляем новые записи, которые есть только в локальных правках
      Object.keys(edits).forEach(id => {
        if (!base.find(p => p.id === id)) {
          merged.push(Object.assign({ id }, edits[id]));
        }
      });

      return merged;
    }

    /**
     * Сохраняет или обновляет запись в локальных правках
     * @param {Object} updated - обновленная запись (минимум: id и измененные поля)
     */
    function savePerson(updated){
      if (!updated || !updated.id) {
        console.error('savePerson: updated.id is required');
        return;
      }

      const editsRaw = localStorage.getItem(EDITS_KEY) || '{}';
      let edits = {};
      try {
        edits = JSON.parse(editsRaw);
      } catch (e) {
        edits = {};
      }

      // Сохраняем только правки (полная запись)
      edits[updated.id] = updated;
      localStorage.setItem(EDITS_KEY, JSON.stringify(edits));

      // Отправляем событие для глобального обновления UI
      window.dispatchEvent(new CustomEvent('savin-tree-data-changed', {
        detail: { id: updated.id, action: 'update' }
      }));
    }

    /**
     * Удаляет все локальные правки (скидывает на базовое состояние)
     */
    function clearEdits(){
      localStorage.removeItem(EDITS_KEY);
      window.dispatchEvent(new CustomEvent('savin-tree-data-changed', {
        detail: { action: 'clear' }
      }));
    }

    /**
     * Экспортирует merged-данные как JSON-строку
     * @returns {Promise<String>} JSON с отступом
     */
    async function exportJSON(){
      const merged = await loadPeople();
      return JSON.stringify(merged, null, 2);
    }

    /**
     * Скачивает merged-данные как файл
     * @param {String} filename - имя файла (по умолчанию SavinTree-data.json)
     */
    async function downloadJSON(filename = 'SavinTree-data.json'){
      const json = await exportJSON();
      const blob = new Blob([json], { type: 'application/json; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return {
      loadPeople,
      savePerson,
      clearEdits,
      exportJSON,
      downloadJSON
    };
  })();
})();
