FROM docker.io/oven/bun:1.3-debian

RUN apt-get update -qq && \
    apt-get install -qq -y --no-install-recommends \
        git \
        openssh-client \
    && \
    rm -rf /var/lib/apt/lists/*