const nodes = document.querySelectorAll('.node');
const dropzone = document.getElementById('dropzone');

nodes.forEach(node => {
    node.addEventListener('dragstart', dragStart);
});

dropzone.addEventListener('dragover', dragOver);
dropzone.addEventListener('drop', drop);

function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.id);
}

function dragOver(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData('text/plain');
    const node = document.getElementById(nodeId);
    dropzone.appendChild(node);
    node.style.position = 'absolute';
    node.style.left = `${event.clientX - dropzone.offsetLeft - node.offsetWidth / 2}px`;
    node.style.top = `${event.clientY - dropzone.offsetTop - node.offsetHeight / 2}px`;
}
