import { Category, WordPair } from '../types';

export const WORD_BANK: Record<Exclude<Category, 'Aleatório'>, Array<{ civil: string; impostor: string }>> = {
  Frutas: [
    { civil: 'Maçã', impostor: 'Pêra' },
    { civil: 'Banana', impostor: 'Banana-da-terra' },
    { civil: 'Laranja', impostor: 'Tangerina' },
    { civil: 'Morango', impostor: 'Framboesa' },
    { civil: 'Limão', impostor: 'Lima' },
    { civil: 'Melancia', impostor: 'Melão' },
    { civil: 'Abacaxi', impostor: 'Maracujá' },
    { civil: 'Açaí', impostor: 'Cupuaçu' },
    { civil: 'Uva', impostor: 'Jabuticaba' },
    { civil: 'Manga', impostor: 'Pêssego' },
    { civil: 'Goiaba', impostor: 'Figo' },
    { civil: 'Kiwi', impostor: 'Carambola' },
    { civil: 'Caju', impostor: 'Acerola' },
    { civil: 'Coco', impostor: 'Castanha' },
  ],
  Objetos: [
    { civil: 'Cadeira', impostor: 'Banco' },
    { civil: 'Garfo', impostor: 'Colher' },
    { civil: 'Copo', impostor: 'Xícara' },
    { civil: 'Caderno', impostor: 'Livro' },
    { civil: 'Teclado', impostor: 'Controle Remoto' },
    { civil: 'Relógio', impostor: 'Despertador' },
    { civil: 'Mochila', impostor: 'Mala' },
    { civil: 'Martelo', impostor: 'Alicate' },
    { civil: 'Escova de Dente', impostor: 'Pente' },
    { civil: 'Espelho', impostor: 'Vidro' },
    { civil: 'Óculos', impostor: 'Lupa' },
    { civil: 'Abajur', impostor: 'Lanterna' },
    { civil: 'Fone de Ouvido', impostor: 'Microfone' },
    { civil: 'Guarda-chuva', impostor: 'Capa de Chuva' },
  ],
  Animais: [
    { civil: 'Cão', impostor: 'Lobo' },
    { civil: 'Gato', impostor: 'Tigre' },
    { civil: 'Cavalo', impostor: 'Zebra' },
    { civil: 'Tubarão', impostor: 'Golfinho' },
    { civil: 'Águia', impostor: 'Gavião' },
    { civil: 'Urso', impostor: 'Panda' },
    { civil: 'Jacaré', impostor: 'Crocodilo' },
    { civil: 'Pinguim', impostor: 'Foca' },
    { civil: 'Leão', impostor: 'Leopardo' },
    { civil: 'Coelho', impostor: 'Lebre' },
    { civil: 'Elefante', impostor: 'Rinoceronte' },
    { civil: 'Tartaruga', impostor: 'Jabuti' },
    { civil: 'Coruja', impostor: 'Gavião' },
    { civil: 'Macaco', impostor: 'Chimpanzé' },
  ],
  Comidas: [
    { civil: 'Pizza', impostor: 'Hambúrguer' },
    { civil: 'Lasanha', impostor: 'Macarrão' },
    { civil: 'Coxinha', impostor: 'Pastel' },
    { civil: 'Sushi', impostor: 'Temaki' },
    { civil: 'Sorvete', impostor: 'Picolé' },
    { civil: 'Bolo', impostor: 'Torta' },
    { civil: 'Batata Frita', impostor: 'Mandioca Frita' },
    { civil: 'Tapioca', impostor: 'Crepe' },
    { civil: 'Strogonoff', impostor: 'Risoto' },
    { civil: 'Pipoca', impostor: 'Amendoim' },
    { civil: 'Pão de Queijo', impostor: 'Biscoito' },
    { civil: 'Churrasco', impostor: 'Espetinho' },
  ],
  Lugares: [
    { civil: 'Praia', impostor: 'Piscina' },
    { civil: 'Cinema', impostor: 'Teatro' },
    { civil: 'Escola', impostor: 'Faculdade' },
    { civil: 'Hospital', impostor: 'Farmácia' },
    { civil: 'Aeroporto', impostor: 'Rodoviária' },
    { civil: 'Parque', impostor: 'Zoológico' },
    { civil: 'Restaurante', impostor: 'Lanchonete' },
    { civil: 'Museu', impostor: 'Biblioteca' },
    { civil: 'Supermercado', impostor: 'Padaria' },
    { civil: 'Hotel', impostor: 'Pousada' },
    { civil: 'Estádio', impostor: 'Ginásio' },
    { civil: 'Circo', impostor: 'Parque de Diversões' },
  ],
};

export function getRandomWordPair(category: Category): WordPair {
  let selectedCategory: Exclude<Category, 'Aleatório'>;
  if (category === 'Aleatório') {
    const categories: Array<Exclude<Category, 'Aleatório'>> = [
      'Frutas',
      'Objetos',
      'Animais',
      'Comidas',
      'Lugares',
    ];
    selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  } else {
    selectedCategory = category;
  }

  const list = WORD_BANK[selectedCategory];
  const item = list[Math.floor(Math.random() * list.length)];

  // Randomly swap civil and impostor with 50% chance to ensure both words get turns as civil
  const swap = Math.random() > 0.5;
  return {
    civil: swap ? item.impostor : item.civil,
    impostor: swap ? item.civil : item.impostor,
    category: selectedCategory,
  };
}
