import { Component, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-fisher-crawford',
  template: `<ion-header><ion-toolbar><ion-title>Fisher-Crawford Tree</ion-title></ion-toolbar></ion-header>
             <ion-content><svg width="100%" height="600"></svg></ion-content>`,
  styles: [`
    .node circle { fill: #69b3a2; }
    .node text { font: 12px sans-serif; }
    .link { fill: none; stroke: #ccc; stroke-width: 2px; }
  `]
})
export class FisherCrawfordComponent implements AfterViewInit {
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

    const width = 800, height = 400;

    const svg = d3.select('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', 'translate(40,40)');

    const treeLayout = d3.tree().size([height - 80, width - 160]);

    const root = d3.hierarchy(data);
    treeLayout(root);

    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

    const node = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle').attr('r', 5);
    node.append('text')
      .attr('dy', 3)
      .attr('x', d => d.children ? -8 : 8)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name);
  }
}
