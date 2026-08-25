FROM alpine:3.20

RUN apk add --no-cache ansible-core openssh-client sshpass

COPY dependencies/ansible/requirements.yml /tmp/requirements.yml
RUN ansible-galaxy collection install -r /tmp/requirements.yml && rm /tmp/requirements.yml
