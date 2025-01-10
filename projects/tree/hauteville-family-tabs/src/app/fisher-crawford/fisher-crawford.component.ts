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
          margin = 40,
          treeWidth = width - 2 * margin,
          treeHeight = height - 2 * margin;

    const treeLayout = d3.tree().size([treeHeight, treeWidth]);
    const root = d3.hierarchy(data);
    treeLayout(root);

    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical()
        .x(d => d.x + margin)
        .y(d => d.y + margin));

    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x + margin},${d.y + margin})`);

    node.append("circle")
      .attr("r", 5);

    node.append("text")
      .attr("dy", 3)
      .attr("x", d => d.children ? -8 : 8)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name);
  }
}
