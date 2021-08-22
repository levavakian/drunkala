if [ "$(docker ps -a | grep drunkalac)" ]
then
  docker start drunkalac > /dev/null
  docker exec -it drunkalac bash
else
  docker run -it --name drunkalac -e DISPLAY --privileged --user $(id -u):$(id -g) -v $(pwd)/../drunkala:/home/apps/drunkala -v $(pwd)/../drunkala/server:/go/src/drunkala/server --network=host drunkala:latest bash
fi