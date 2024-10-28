// Fonction utilitaire pour vérifier si une date est un jour ouvré
const isBusinessDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Dimanche, 6 = Samedi
};

// Fonction pour compter les jours ouvrés entre deux dates
const countBusinessDays = (start, end) => {
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Fonction pour ajouter n jours ouvrés à une date
const addBusinessDays = (date, days) => {
  let current = new Date(date);
  let remaining = days;
  
  while (remaining > 0) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      remaining--;
    }
  }
  return current;
};

// Custom scale qui ignore les weekends
function businessDayScale() {
  let domain = [new Date(), new Date()];
  let range = [0, 1];
  
  function scale(date) {
    const totalBusinessDays = countBusinessDays(domain[0], domain[1]);
    const businessDaysTillDate = countBusinessDays(domain[0], date);
    
    // Normaliser entre 0 et 1
    const normalized = businessDaysTillDate / totalBusinessDays;
    
    // Interpoler vers l'intervalle de sortie
    return range[0] + (normalized * (range[1] - range[0]));
  }
  
  // Fonction inverse (position vers date)
  scale.invert = function(position) {
    const normalized = (position - range[0]) / (range[1] - range[0]);
    const totalBusinessDays = countBusinessDays(domain[0], domain[1]);
    const targetBusinessDays = Math.round(normalized * totalBusinessDays);
    
    return addBusinessDays(domain[0], targetBusinessDays);
  };
  
  // Setters/getters comme d3.scaleTime
  scale.domain = function(newDomain) {
    if (!arguments.length) return domain;
    domain = newDomain;
    return scale;
  };
  
  scale.range = function(newRange) {
    if (!arguments.length) return range;
    range = newRange;
    return scale;
  };
  
  // Fonction pour générer les graduations (ticks)
  scale.ticks = function(count = 10) {
    const totalDays = countBusinessDays(domain[0], domain[1]);
    const tickCount = Math.min(totalDays, count);
    const step = Math.max(1, Math.floor(totalDays / tickCount));
    
    const ticks = [];
    let current = new Date(domain[0]);
    
    while (current <= domain[1]) {
      if (isBusinessDay(current)) {
        ticks.push(new Date(current));
      }
      current.setDate(current.getDate() + step);
    }
    
    return ticks;
  };

  return scale;
}