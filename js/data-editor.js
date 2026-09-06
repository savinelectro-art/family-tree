/**
 * SavinTree Data Editor
 * Логика редактирования персон, сохранения и экспорта
 */

(function(){
  let currentEditId = null;

  /**
   * Открывает редактор с данными персоны
   */
  function openEditor(person){
    if (!person) return;

    currentEditId = person.id;

    // Заполняем форму редактирования
    document.getElementById('edit-name').value = person.name || '';
    document.getElementById('edit-years').value = person.years || '';
    document.getElementById('edit-place').value = person.place || '';
    document.getElementById('edit-bio').value = person.bio || '';
    document.getElementById('edit-photo').value = person.photo || '';

    // Показываем редактор.
    // ИСПРАВЛЕНО: раньше стояло display = 'block', но в CSS .editor-panel
    // задан как flex-контейнер (display:flex; align-items:center; justify-content:center)
    // для центрирования модального окна. 'block' ломал центрирование —
    // окно уезжало в левый верхний угол экрана.
    const editor = document.getElementById('editor-panel');
    if (editor) {
      editor.style.display = 'flex';
      editor.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Закрывает редактор
   */
  function closeEditor(){
    const editor = document.getElementById('editor-panel');
    if (editor) {
      editor.style.display = 'none';
      editor.setAttribute('aria-hidden', 'true');
    }
    currentEditId = null;
  }

  /**
   * Сохраняет данные из формы редактирования
   */
  async function saveEdit(){
    if (!currentEditId) return;

    const updated = {
      id: currentEditId,
      name: document.getElementById('edit-name').value || '',
      years: document.getElementById('edit-years').value || '',
      place: document.getElementById('edit-place').value || '',
      bio: document.getElementById('edit-bio').value || '',
      photo: document.getElementById('edit-photo').value || null
    };

    // Сохраняем через data-loader
    if (window.SavinTreeData) {
      window.SavinTreeData.savePerson(updated);
      closeEditor();
    } else {
      console.error('SavinTreeData not available');
    }
  }

  /**
   * Экспортирует merged-данные как JSON-файл
   */
  async function exportToJSON(){
    if (window.SavinTreeData) {
      try {
        await window.SavinTreeData.downloadJSON('SavinTree-export.json');
        alert('Данные экспортированы успешно!');
      } catch (err) {
        console.error('Export failed:', err);
        alert('Ошибка при экспорте данных');
      }
    }
  }

  /**
   * Проверяет, открыт ли редактор в данный момент
   */
  function isOpen(){
    const editor = document.getElementById('editor-panel');
    return !!editor && editor.style.display === 'flex';
  }

  /**
   * Инициализирует обработчики редактирования
   */
  function init(){
    // Кнопка Сохранить
    const saveBtn = document.getElementById('save-edit');
    if (saveBtn) saveBtn.addEventListener('click', saveEdit);

    // Кнопка Отмена
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);

    // Кнопка Экспорт JSON
    const exportBtn = document.getElementById('export-json');
    if (exportBtn) exportBtn.addEventListener('click', exportToJSON);

    // ИСПРАВЛЕНО: раньше Escape закрывал только карточку/боковую панель,
    // но не панель редактирования — теперь закрывает и её тоже.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) closeEditor();
    });

    // Клик по тёмному фону тоже закрывает редактор (клик по самой карточке не всплывёт до фона)
    const editorPanel = document.getElementById('editor-panel');
    if (editorPanel) {
      editorPanel.addEventListener('click', e => {
        if (e.target === editorPanel) closeEditor();
      });
    }

    // Экспортируем функции в глобальный scope для использования из index.html
    window.SavinTreeEditor = {
      openEditor,
      closeEditor,
      saveEdit,
      exportToJSON,
      isOpen
    };
  }

  // Инициализируем при загрузке DOM
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
