#!/bin/bash
# One-liner SSH Fix - Paste this entire block in server terminal

echo "=== SSH Quick Fix ===" && \
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup && \
sudo bash -c 'cat > /etc/ssh/sshd_config << "EOF"
Port 22
AddressFamily any
ListenAddress 0.0.0.0
ListenAddress ::
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
PermitRootLogin yes
PubkeyAuthentication yes
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
RekeyLimit default none
EOF
' && \
sudo sshd -t && \
sudo systemctl restart sshd && \
mkdir -p ~/.ssh && \
chmod 700 ~/.ssh && \
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz" > ~/.ssh/authorized_keys && \
chmod 600 ~/.ssh/authorized_keys && \
echo "✓ SSH configured successfully!" && \
echo "✓ SSH key installed!" && \
echo "" && \
echo "Test from Windows: ssh root@192.168.1.8"
