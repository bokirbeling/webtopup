#!/bin/bash
# Quick SSH Fix Script
# Run this on server 192.168.1.8 as root

echo "Backing up original sshd_config..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

echo "Applying SSH configuration..."
cat > /etc/ssh/sshd_config << 'EOF'
# SSH Server Configuration
Port 22
AddressFamily any
ListenAddress 0.0.0.0
ListenAddress ::

# Host Keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
PermitRootLogin yes
PubkeyAuthentication yes
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Security
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server

# Ciphers and keying
RekeyLimit default none
EOF

echo "Testing SSH configuration..."
sshd -t

if [ $? -eq 0 ]; then
    echo "Configuration valid. Restarting SSH..."
    systemctl restart sshd || service ssh restart
    echo "✓ SSH configured successfully!"
    echo ""
    echo "Now add SSH key:"
    echo "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
    echo "nano ~/.ssh/authorized_keys"
    echo "# Paste the public key, then:"
    echo "chmod 600 ~/.ssh/authorized_keys"
else
    echo "✗ Configuration error. Restoring backup..."
    cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
fi
