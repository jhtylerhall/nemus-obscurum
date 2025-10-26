export type HUDState = {
  population: number;
  techLevel: number;
  energyUse: number;
};

export class HUD {
  private readonly root: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.style.top = '1rem';
    this.root.style.right = '1rem';
    this.root.style.padding = '0.75rem 1rem';
    this.root.style.background = 'rgba(3, 7, 18, 0.6)';
    this.root.style.color = '#e2e8f0';
    this.root.style.fontFamily = 'system-ui, sans-serif';
    this.root.style.fontSize = '0.875rem';
    this.root.style.lineHeight = '1.25rem';
    this.root.style.borderRadius = '0.5rem';
    container.appendChild(this.root);
  }

  update(state: HUDState): void {
    this.root.innerHTML = `\
      <div>Population: ${state.population.toFixed(2)}</div>
      <div>Tech Level: ${state.techLevel.toFixed(2)}</div>
      <div>Energy Use: ${(state.energyUse * 100).toFixed(1)}%</div>
    `;
  }
}
