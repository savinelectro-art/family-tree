// Данные семьи
const familyData = [
    // Поколение 1 (прапрадеды)
    {
        id: 1,
        name: "Иван Сохарев",
        birth: 1920,
        death: 1995,
        generation: 1,
        spouse: 2
    },
    {
        id: 2,
        name: "Мария Сохарева",
        birth: 1925,
        death: 2000,
        generation: 1,
        spouse: 1
    },
    
    // Поколение 2 (прадеды)
    {
        id: 3,
        name: "Петр Сохарев",
        birth: 1945,
        death: null,
        generation: 2,
        parents: [1, 2],
        spouse: 4
    },
    {
        id: 4,
        name: "Анна Сохарева",
        birth: 1948,
        death: null,
        generation: 2,
        spouse: 3
    },
    
    // Поколение 3 (дедушки-бабушки)
    {
        id: 5,
        name: "Владимир Сохарев",
        birth: 1970,
        death: null,
        generation: 3,
        parents: [3, 4],
        spouse: 6
    },
    {
        id: 6,
        name: "Елена Сохарева",
        birth: 1972,
        death: null,
        generation: 3,
        spouse: 5
    },
    
    // Поколение 4 (родители)
    {
        id: 7,
        name: "Сергей Сохарев",
        birth: 1995,
        death: null,
        generation: 4,
        parents: [5, 6],
        spouse: 8
    },
    {
        id: 8,
        name: "Ольга Сохарева",
        birth: 1997,
        death: null,
        generation: 4,
        spouse: 7
    },
    
    // Поколение 5 (дети)
    {
        id: 9,
        name: "Александр Сохарев",
        birth: 2020,
        death: null,
        generation: 5,
        parents: [7, 8]
    },
    {
        id: 10,
        name: "София Сохарева",
        birth: 2022,
        death: null,
        generation: 5,
        parents: [7, 8]
    }
];