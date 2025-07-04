
const settings = {
  particles: {
    length: 15000,
    duration: 4,
    velocity: 100,
    effect: -1.3,
    size: 6,
    color: "f50b02"
  },
  text: {
    content: "",
    size: 150,
    yOffset: 0
  }
};

const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  settings.text.yOffset = canvas.height * 0.15;
}

class Point {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  clone() {
    return new Point(this.x, this.y);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const length = this.length();
    this.x /= length;
    this.y /= length;
    return this;
  }
}

// Particle class
class Particle {
  constructor() {
    this.position = new Point();
    this.velocity = new Point();
    this.acceleration = new Point();
    this.age = 0;
  }

  initialize(x, y, dx, dy) {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = dx;
    this.velocity.y = dy;
    this.acceleration.x = dx * settings.particles.effect;
    this.acceleration.y = dy * settings.particles.effect;
    this.age = 0;
  }

  update(deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.age += deltaTime;
  }

  draw(context) {
    const ease = (t) => (--t) * t * t + 1;
    const size = settings.particles.size * ease(this.age / settings.particles.duration);
    const alpha = 1 - this.age / settings.particles.duration;
    
    context.fillStyle = settings.particles.color;
    context.globalAlpha = alpha;
    context.beginPath();
    context.arc(this.position.x, this.position.y, size / 2, 0, Math.PI * 2);
    context.fill();
  }
}

// Particle pool for better performance
class ParticlePool {
  constructor(length) {
    this.particles = new Array(length).fill().map(() => new Particle());
    this.firstActive = 0;
    this.firstFree = 0;
  }

  add(x, y, dx, dy) {
    this.particles[this.firstFree].initialize(x, y, dx, dy);
    this.firstFree = (this.firstFree + 1) % this.particles.length;
    if (this.firstActive === this.firstFree) {
      this.firstActive = (this.firstActive + 1) % this.particles.length;
    }
  }

  update(deltaTime) {
    let i = this.firstActive;
    while (i !== this.firstFree) {
      this.particles[i].update(deltaTime);
      i = (i + 1) % this.particles.length;
    }

    while (this.particles[this.firstActive].age >= settings.particles.duration && 
           this.firstActive !== this.firstFree) {
      this.firstActive = (this.firstActive + 1) % this.particles.length;
    }
  }

  draw(context) {
    let i = this.firstActive;
    while (i !== this.firstFree) {
      this.particles[i].draw(context);
      i = (i + 1) % this.particles.length;
    }
  }
}

// Heart shape function
function pointOnHeart(t) {
  return new Point(
    160 * Math.pow(Math.sin(t), 3),
    130 * Math.cos(t) -
    50 * Math.cos(2 * t) -
    20 * Math.cos(3 * t) -
    10 * Math.cos(4 * t) +
    25
  );
}

// Text particles
function getTextParticles() {
  ctx.font = `bold ${settings.text.size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const textWidth = ctx.measureText(settings.text.content).width;
  const x = canvas.width / 2;
  const y = canvas.height / 2 + settings.text.yOffset;
  
  // Draw text to get pixel data
  ctx.fillStyle = 'white';
  ctx.fillText(settings.text.content, x, y);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const particles = [];
  const scale = 2; // Sampling scale for performance
  
  for (let y = 0; y < canvas.height; y += scale) {
    for (let x = 0; x < canvas.width; x += scale) {
      const index = (y * canvas.width + x) * 4;
      if (imageData[index + 3] > 128) { // If pixel is not transparent
        particles.push(new Point(x - canvas.width / 2, y - canvas.height / 2 - settings.text.yOffset));
      }
    }
  }
  
  return particles;
}

// Main animation
function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  const particles = new ParticlePool(settings.particles.length);
  const particleRate = settings.particles.length / settings.particles.duration;
  const textParticles = getTextParticles();
  let time;
  
  function render() {
    requestAnimationFrame(render);
    const newTime = Date.now() / 1000;
    const deltaTime = newTime - (time || newTime);
    time = newTime;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add heart particles
    const heartAmount = particleRate * deltaTime * 0.7;
    for (let i = 0; i < heartAmount; i++) {
      const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      const dir = pos.clone().normalize().length(settings.particles.velocity);
      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 - pos.y,
        dir.x,
        -dir.y
      );
    }
    
    // Add text particles
    const textAmount = particleRate * deltaTime * 0.3;
    for (let i = 0; i < textAmount && textParticles.length > 0; i++) {
      const index = Math.floor(Math.random() * textParticles.length);
      const pos = textParticles[index];
      const dir = new Point(
        (Math.random() - 0.5) * settings.particles.velocity * 0.5,
        (Math.random() - 0.5) * settings.particles.velocity * 0.5
      );
      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 + pos.y,
        dir.x,
        dir.y
      );
    }
    
    particles.update(deltaTime);
    particles.draw(ctx);
  }
  
  render();
}

// Start the animation
init();