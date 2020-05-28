FROM node:12.16.2
LABEL maintainer="gz@usetech.com"

RUN apt-get update && apt-get install -y python build-essential

WORKDIR "/src"
COPY [".", "."]

RUN npm install

RUN chmod +x ./run.sh
CMD ["bash", "-c", "./run.sh"]
