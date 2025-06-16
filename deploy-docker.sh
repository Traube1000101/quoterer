#!/usr/bin/env bash

show_help() {
cat <<- 
	Usage: $0 [-n NAME] [-p PATH] DOCKER_REGISTRY

	Arguments:
	  DOCKER_REGISTRY Specify the docker registry path

	Options:
	  -n, --name      Specify the image name
	  -p, --path      Path to Dockerfile or dir
	  -h, --help      Show this help message

	Environment:
	  DOCKER_REGISTRY Can be set as an env var and will be use if it is not supplied

   
}

build_args=()
path="$PWD"

PARSED=$(getopt -o n:p:h --long name:,path:,help -- "$@")
if [[ $? -ne 0 ]]; then
    show_help
    exit 1
fi

eval set -- "$PARSED"

while true; do
    case "$1" in
        -n|--name)
            name="$2"
            shift 2
            ;;
        -p|--path)
            path="$2"
            if [ -f "$2" ]; then
              build_args=("-f" "$2")
              path=$(dirname "$2")
            fi
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            break
            ;;
    esac
done

if [ $# -lt 1 ]; then
  if [ ! -n "$DOCKER_REGISTRY" ]; then
    printf "Error: DOCKER_REGISTRY must be defined.\n\n"
    show_help
    exit 1
  fi
  registry="$DOCKER_REGISTRY"
else
  registry="$1"
fi

if [ ! -n "$name" ]; then
    name=$(basename "$path")
fi

docker buildx build --platform linux/amd64 --push -t "$registry/$name":latest "${build_args[@]}" "$path"
