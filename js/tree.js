// Функция для отображения дерева
function renderTree() {
    const container = document.getElementById('tree-container');
    container.innerHTML = '';
    
    // Группируем людей по поколениям
    const generations = {};
    familyData.forEach(person => {
        if (!generations[person.generation]) {
            generations[person.generation] = [];
        }
        generations[person.generation].push(person);
    });
    
    // Сортируем поколения
    const sortedGenerations = Object.keys(generations).sort((a, b) => a - b);
    
    sortedGenerations.forEach(gen => {
        const generationDiv = document.createElement('div');
        generationDiv.className = 'generation';
        generationDiv.innerHTML = `<h2>Поколение ${gen}</h2>`;
        
        const peopleDiv = document.createElement('div');
        peopleDiv.style.display = 'flex';
        peopleDiv.style.gap = '20px';
        peopleDiv.style.flexWrap = 'wrap';
        peopleDiv.style.justifyContent = 'center';
        
        generations[gen].forEach(person => {
            const personDiv = document.createElement('div');
            personDiv.className = 'person';
            personDiv.innerHTML = `
                <h3>${person.name}</h3>
                <p>${person.birth}${person.death ? ' - ' + person.death : ' - наст. время'}</p>
                <p>ID: ${person.id}</p>
            `;
            personDiv.onclick = () => showPersonDetails(person);
            peopleDiv.appendChild(personDiv);
        });
        
        generationDiv.appendChild(peopleDiv);
        container.appendChild(generationDiv);
    });
}

// Показать детали человека
function showPersonDetails(person) {
    alert(`
    Имя: ${person.name}
    Рождение: ${person.birth}
    Смерть: ${person.death || 'живая'}
    Поколение: ${person.generation}
    `);
}

// Добавить нового человека
function addPerson(name, birth, death, generation, parentIds = [], spouseId = null) {
    const newId = Math.max(...familyData.map(p => p.id)) + 1;
    familyData.push({
        id: newId,
        name: name,
        birth: birth,
        death: death,
        generation: generation,
        parents: parentIds,
        spouse: spouseId
    });
    renderTree();
}

// Удалить человека
function removePerson(personId) {
    const index = familyData.findIndex(p => p.id === personId);
    if (index > -1) {
        familyData.splice(index, 1);
        renderTree();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    renderTree();
});