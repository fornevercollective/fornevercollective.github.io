import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-fisher-crawford',
  templateUrl: './fisher-crawford.component.html',
  styleUrls: ['./fisher-crawford.component.scss'],
})
export class FisherCrawfordComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    this.createChart();
  }

  createChart() {
    const data = {
      name: "Fisher-Crawford",
      children: [
        { name: "Child 1" },
        { name: "Child 2" }
      ]
    };

    const svg = d3.select("svg"),
          width = +svg.attr("width"),
          height = +svg.attr("height"),
          radius = Math.min(width, height) / 2 - 40;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const radialTree = d3.tree().size([2 * Math.PI, radius]);

    const root = d3.hierarchy(data);
    radialTree(root);

    const link = d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y);

    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", link);

    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);

    node.append("circle")
      .attr("r", 5);

    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
      .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
      .text(d => d.data.name);
  }
}
