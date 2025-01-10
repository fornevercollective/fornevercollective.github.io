import { Component, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-lepage-bandet',
  template: `<ion-header><ion-toolbar><ion-title>Lepage-Bandet Tree</ion-title></ion-toolbar></ion-header>
             <ion-content><svg width="100%" height="600"></svg></ion-content>`,
  styles: [`
    .node circle { fill: #69b3a2; }
    .node text { font: 10px sans-serif; }
    .link { fill: none; stroke: #ccc; stroke-width: 2px; }
  `]
})
export class LepageBandetComponent implements AfterViewInit {
  ngAfterViewInit() {
    const data = {
      name: 'Tancred of Hauteville',
      children: [
        { name: 'William Iron Arm' },
        {
          name: 'Humphrey of Hauteville',
          children: [
            { name: 'Robert Guiscard' },
            { name: 'Roger I of Sicily' },
          ],
        },
        {
          name: 'Roger I of Sicily',
          children: [
            { name: 'Roger II of Sicily' },
            { name: 'Simon of Sicily' },
          ],
        },
      ],
    };

    const width = 600, height = 600;

    const svg = d3.select('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const tree = d3.tree().size([2 * Math.PI, 250]).separation(() => 1);

    const root = d3.hierarchy(data);
    tree(root);

    const link = svg.append('g')
      .selectAll('path')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y));

    const node = svg.append('g')
      .selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => `
        rotate(${(d.x * 180 / Math.PI - 90)})
        translate(${d.y},0)`);

    node.append('circle').attr('r', 4);

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .style('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .text(d => d.data.name);
  }
}
