/**
 * Protocolos de Antropometria - Circunferências
 */

const ANTRO_PROTOCOLOS = {
  USNAVY: {
    nome: "U.S. Navy",
    desc: "Cálculo baseado em circunferências e altura. Utilizado amplamente para estimar % Gordura sem dobras cutâneas.",
    formula_m: "BF% = 86.010 * log10(abdomen - pescoço) - 70.041 * log10(altura) + 36.76",
    formula_f: "BF% = 163.205 * log10(abdomen + quadril - pescoço) - 97.684 * log10(altura) - 78.387",
    calcular: (dados, sexo) => {
      const { abdomen, pescoco, altura, quadril, peso } = dados;
      let bf = 0;
      if (sexo === 'M') {
        // Fórmula U.S. Navy Masculina
        bf = 495 / (1.0324 - 0.19077 * Math.log10(abdomen - pescoco) + 0.15456 * Math.log10(altura)) - 450;
      } else {
        // Fórmula U.S. Navy Feminina
        bf = 495 / (1.29579 - 0.35004 * Math.log10(abdomen + quadril - pescoco) + 0.22100 * Math.log10(altura)) - 450;
      }
      
      const gorduraKg = (bf / 100) * peso;
      const massaMagraKg = peso - gorduraKg;
      
      return {
        bf: bf.toFixed(2),
        gorduraKg: gorduraKg.toFixed(2),
        massaMagraKg: massaMagraKg.toFixed(2)
      };
    }
  },
  WELTMAN: {
    nome: "Weltman (Mulheres)",
    desc: "Protocolo específico para mulheres obesas ou com sobrepeso, utilizando abdômen e quadril.",
    formula_f: "BF% = 0.302 * (Abdomen) + 0.457 * (Quadril) - 0.118 * (Altura) + 21.99",
    calcular: (dados, sexo) => {
      if (sexo !== 'F') return null;
      const { abdomen, quadril, altura, peso } = dados;
      const bf = 0.302 * abdomen + 0.457 * quadril - 0.118 * altura + 21.99;
      
      const gorduraKg = (bf / 100) * peso;
      const massaMagraKg = peso - gorduraKg;
      
      return {
        bf: bf.toFixed(2),
        gorduraKg: gorduraKg.toFixed(2),
        massaMagraKg: massaMagraKg.toFixed(2)
      };
    }
  },
  HODGDON: {
    nome: "Hodgdon & Beckett",
    desc: "Estimativa de densidade corporal para homens.",
    formula_m: "DC = 1.0324 - 0.19077 * log10(Cintura - Pescoço) + 0.15456 * log10(Altura)",
    calcular: (dados, sexo) => {
      if (sexo !== 'M') return null;
      const { cintura, pescoco, altura, peso } = dados;
      const dc = 1.0324 - 0.19077 * Math.log10(cintura - pescoco) + 0.15456 * Math.log10(altura);
      const bf = (495 / dc) - 450;
      
      const gorduraKg = (bf / 100) * peso;
      const massaMagraKg = peso - gorduraKg;
      
      return {
        bf: bf.toFixed(2),
        gorduraKg: gorduraKg.toFixed(2),
        massaMagraKg: massaMagraKg.toFixed(2)
      };
    }
  }
};

window.ANTRO_PROTOCOLOS = ANTRO_PROTOCOLOS;
