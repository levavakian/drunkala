 
FROM golang:1.14

WORKDIR /root

RUN apt-get update && apt-get install -y git sudo curl wget nano unzip python3-pip gnupg
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add -
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install nodejs

RUN adduser apps
RUN echo "apps     ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers
RUN mkdir -p /home/apps/drunkala && chown apps:apps /home/apps
COPY client /home/apps/drunkala/client
COPY server /go/src/drunkala/server
ENV GO111MODULE=on
WORKDIR /home/apps/drunkala/client
RUN npm install
RUN npm run build
WORKDIR /go/src/drunkala/server
RUN go get && go install
RUN chown -R apps:apps /go/

USER apps
WORKDIR /home/apps/drunkala