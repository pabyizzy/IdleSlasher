export class Hero {
  constructor(x, y, config) {
    this.x = x;
    this.y = y;
    this.radius = config.HERO_RADIUS;
    this.speed = config.HERO_SPEED;
    this.maxHealth = config.HERO_HEALTH;
    this.health = this.maxHealth;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
  }

  draw(ctx, assets, config) {
    const img = assets.getImage("HERO");
    if (img) {
      const scale = config.SPRITES.HERO_SCALE;
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.drawImage(img, this.x - width / 2, this.y - height / 2, width, height);
      return;
    }
    ctx.fillStyle = config.COLORS.HERO;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Enemy {
  constructor(x, y, speed, config, type) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.radius = type.radius ?? config.ENEMY_RADIUS;
    this.alive = true;
    this.type = type;
    this.maxHealth = type.health;
    this.health = type.health;
    this.hitCooldown = 0;
    this.hitCooldownDuration = type.hitCooldown ?? config.ENEMY_HIT_COOLDOWN;
  }

  update(dt, hero) {
    if (this.hitCooldown > 0) {
      this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    }
    const dx = hero.x - this.x;
    const dy = hero.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }

  draw(ctx, assets, config) {
    const img = assets.getImage("ENEMY");
    if (img) {
      const scale = config.SPRITES.ENEMY_SCALE;
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.drawImage(img, this.x - width / 2, this.y - height / 2, width, height);
      this.drawHealth(ctx);
      return;
    }
    if (this.maxHealth > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
    }
    ctx.fillStyle = this.type.color;
    switch (this.type.shape) {
      case "square":
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        if (this.maxHealth > 1) {
          ctx.strokeRect(this.x - this.radius - 2, this.y - this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
        }
        break;
      case "diamond":
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        if (this.maxHealth > 1) {
          ctx.strokeRect(-this.radius - 2, -this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
        }
        ctx.restore();
        break;
      case "hex":
        this.drawHex(ctx);
        if (this.maxHealth > 1) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      default:
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        if (this.maxHealth > 1) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
    }
    if (this.maxHealth > 1) {
      ctx.restore();
    }
  }

  drawHealth(ctx) {
    if (this.health <= 1) return;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Segoe UI, Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(this.health), this.x, this.y - this.radius - 12);
    ctx.restore();
  }

  drawHex(ctx) {
    const r = this.radius;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = this.x + Math.cos(angle) * r;
      const y = this.y + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

export class Weapon {
  constructor(hero, config) {
    this.hero = hero;
    this.radius = config.WEAPON_RADIUS;
    this.orbitRadius = config.WEAPON_ORBIT_RADIUS;
    this.angularSpeed = config.WEAPON_ANGULAR_SPEED;
    this.angle = 0;
    this.x = hero.x;
    this.y = hero.y;
  }

  update(dt) {
    this.angle += this.angularSpeed * dt;
    this.x = this.hero.x + Math.cos(this.angle) * this.orbitRadius;
    this.y = this.hero.y + Math.sin(this.angle) * this.orbitRadius;
  }

  draw(ctx, assets, config) {
    this.drawAt(ctx, assets, config, this.x, this.y, this.angle);
  }

  drawAt(ctx, assets, config, x, y, angle) {
    const img = assets.getImage("WEAPON");
    if (img) {
      const scale = config.SPRITES.WEAPON_SCALE;
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();
      return;
    }
    ctx.strokeStyle = config.COLORS.WEAPON;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export class Particle {
  constructor(x, y, velocityX, velocityY, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = velocityX;
    this.vy = velocityY;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.max(this.life / this.maxLife, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class PowerUp {
  constructor(x, y, type, config) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = config.POWERUP_RADIUS;
    this.shape = type.shape;
    this.hueMin = type.hueRange[0];
    this.hueMax = type.hueRange[1];
    this.cycleSpeed = type.cycleSpeed;
    this.time = 0;
    this.spin = Math.random() * Math.PI * 2;
    this.size = type.size;
  }

  update(dt) {
    this.time += dt;
    this.spin += dt * 1.5;
  }

  draw(ctx) {
    const range = this.hueMax - this.hueMin;
    const hue = this.hueMin + ((this.time * this.cycleSpeed) % range);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.shadowColor = `hsla(${hue}, 85%, 60%, 0.75)`;
    ctx.shadowBlur = 18;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

    switch (this.shape) {
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        ctx.fill();
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case "square":
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }
}
