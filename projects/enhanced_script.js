const nodes = [
    createNode('Node 1', 'node1'),
    createNode('Node 2', 'node2'),
    createNode('Node 3', 'node3')
];
const dropzone = document.getElementById('dropzone');
const svgCanvas = document.getElementById('svgCanvas');
const connections = [];

nodes.forEach(node => {
    dropzone.appendChild(node);
    node.addEventListener('dragstart', dragStart);
    node.addEventListener('dragend', dragEnd);
});

dropzone.addEventListener('dragover', dragOver);
dropzone.addEventListener('drop', drop);

function createNode(label, id) {
    const node = document.createElement('div');
    node.className = 'node';
    node.draggable = true;
    node.id = id;
    node.textContent = label;
    return node;
}

function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.id);
    event.target.style.zIndex = 1000;
}

function dragEnd(event) {
    event.target.style.zIndex = 'auto';
    updateConnections();
}

function dragOver(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData('text/plain');
    const node = document.getElementById(nodeId);
    dropzone.appendChild(node);
    node.style.left = `${event.clientX - dropzone.offsetLeft - node.offsetWidth / 2}px`;
    node.style.top = `${event.clientY - dropzone.offsetTop - node.offsetHeight / 2}px`;
}

function updateConnections() {
    while (svgCanvas.firstChild) {
        svgCanvas.removeChild(svgCanvas.firstChild);
    }
    connections.forEach(([node1, node2]) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const rect1 = node1.getBoundingClientRect();
        const rect2 = node2.getBoundingClientRect();
        line.setAttribute('x1', rect1.left + rect1.width / 2 + window.scrollX);
        line.setAttribute('y1', rect1.top + rect1.height / 2 + window.scrollY);
        line.setAttribute('x2', rect2.left + rect2.width / 2 + window.scrollX);
        line.setAttribute('y2', rect2.top + rect2.height / 2 + window.scrollY);
        line.classList.add('line');
        svgCanvas.appendChild(line);
    });
}

function savePositions() {
    const positions = nodes.map(node => ({
        id: node.id,
        left: node.style.left,
        top: node.style.top
    }));
    localStorage.setItem('nodePositions', JSON.stringify(positions));
}

function loadPositions() {
    const positions = JSON.parse(localStorage.getItem('nodePositions'));
    if (positions) {
        positions.forEach(pos => {
            const node = document.getElementById(pos.id);
            node.style.left = pos.left;
            node.style.top = pos.top;
        });
        updateConnections();
    }
}

// Example to connect nodes
connections.push([document.getElementById('node1'), document.getElementById('node2')]);
connections.push([document.getElementById('node2'), document.getElementById('node3')]);
updateConnections();
