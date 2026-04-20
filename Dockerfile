FROM caddy:2-alpine

EXPOSE 80
VOLUME ["/storage"]

COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html style.css game.js /srv/
