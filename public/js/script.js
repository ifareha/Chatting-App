const socket = io();
const input = document.querySelector(".send-input");
const submitInput = document.querySelector(".overlay input");
var submitButton = document.querySelector(".submit-btn");
var sendButton = document.querySelector(".send-btn");
var nameSetUsers = document.querySelector(".name-set");
var allmembers = document.querySelector(".all-members");
var username = document.querySelector(".username");
var typing = document.querySelector(".typing");
var chatBox = document.querySelector(".chat-box");
var leavebtn = document.querySelector(".leave")
var videoCallBtn = document.querySelector("#video-call")
var chatMessages = document.querySelector(".chat-messages");


//calling variables
var callContainer =  document.querySelector(".call-container")
var video =  document.querySelector(".video")
var videoCall =  document.querySelector(".videoCall")
var cameraOffBg = document.querySelector(".cameraOff-bg")
var IncommingCall = document.querySelector(".call-overlay")
var incomCallName = document.querySelector(".incommingCall")
var answer = document.querySelector("#answer")
var decline = document.querySelector("#decline")
var back = document.querySelector(".back")
var callDecline = document.querySelector(".callDecline")
var controlers =  document.querySelector(".controlers")
var callEndText =  document.querySelector(".callEndText")
var callEnd =  document.querySelector("#endCall")
var remoteVideo =  document.querySelector("#remoteVideo")
var localVideo =  document.querySelector("#localVideo")

let room;



socket.on("nameSetDone", function() {
    document.querySelector(".overlay").style.display = "none";
    nameSetUsers.textContent = submitInput.value.trim();

});

submitButton.addEventListener("click", function() {
    if (submitInput.value.trim().length > 0 ) {
        socket.emit("nameSet", {name:submitInput.value.trim()});
    }
});
let friend;
socket.on("totalUsers", function(data) {
    let clutter = "";
    data.userNames.forEach(function(user, index) {
        
         if(data.userId[index] !== socket.id){
            clutter +=   
            ` <li class="userSelect flex w-full items-center space-x-4 p-2 hover:bg-gray-200 rounded-lg cursor-pointer" onclick="startChat('${data.userId[index]}', '${user}')">
            <div>
                <h2 class="user text-md font-semibold">${user.name}</h2>
                <p class="text-xs text-gray-500">${data.userStatus[index]}</p>
            </div>
        </li>`;
        }  
    friend = user;
    allmembers.innerHTML = clutter;
});
});

function startChat(selectedUserId) {
  clearChatMessages();  
  socket.emit('startChat', selectedUserId); 

}

socket.on('joinRoom', function(data) {
    room = data.room;
    socket.emit('joinRoom', room);
    if(window.innerWidth <= 640){
        document.querySelector(".left-part").style.display = "none";
       }
       document.querySelector(".welcomeArea").style.display = 'none';
       document.querySelector(".right-part").style.display = "block";

       username.textContent = data.friendName.name;  
       
       document.querySelector(".formSubmit").addEventListener("submit", function(event){
        event.preventDefault();
        if(input.value.trim()!== ""){
            socket.emit('message', input.value,room);
            input.value = "";
        }
    });
    
   
});
function clearChatMessages() {
  chatMessages.innerHTML = '';  // Clear all chat messages
}
input.addEventListener("input", function(){
    socket.emit("typing")
})

let timer;

socket.on("typing", function({name}){
     typing.textContent = `${name.name} is typing..`;
    
     
     
clearTimeout(timer);
timer = setTimeout(function(){
    typing.textContent = "";
}, 1200)
})
socket.on("message", function(data) {
    const { message, userId } = data;  
    let container =  "";
    
    let currentTime = new Date();
    let hours = currentTime.getHours();
    let minutes = currentTime.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let timeStr = hours + ':' + minutes + ' ' + ampm;

    if (userId === socket.id) {
        container += `<div class="flex w-full flex-col mt-5 items-end px-4">
                        <div class="bg-orange-500 text-white rounded-md px-3 py-1 max-sm:p-0 max-sm:px-2">
                            <p class="text-sm max-sm:text-[1.7vw] max-sm:leading-[2]">${message}</p>
                        </div>
                                                <p class="text-xs max-sm:text-[1.5vw] max-sm:leading-[1.5] mt-1">${timeStr}</p>
                    </div>`
    } else {
        container += `<div class="flex w-full flex-col mt-5 items-start px-4">
                        <div class="bg-zinc-400 text-white rounded-md  px-3 py-1 max-sm:p-0 max-sm:px-2">
                            <p class="text-sm max-sm:text-[1.7vw] max-sm:leading-[2]">${message}</p>
                        </div>
                                                <p class="text-xs max-sm:text-[1.5vw] max-sm:leading-[1.5] mt-1">${timeStr}</p>
                    </div>`
    }
    chatMessages.innerHTML += container;
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

let local;
let remote;
let peerConnection;
let inCall = false;
const rtcSettings = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
    ]
};

const initialize = async () => {
    socket.on("signalingMessage", handleSignalingMessage);
    await createPeerConnection()
    try {
        local = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = local;
        localVideo.style.display = "block";
       
        inCall = true;
        initiateOffer();
    } catch (err) {
        
    }
};

const initiateOffer = async () => {
   await createPeerConnection(); // Check if peer connection is available
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("signalingMessage", {
            room,
            message: JSON.stringify({ type: "offer", offer })
        });
    } catch (err) {
        console.log("Failed to create offer", err);
    }
};

const createPeerConnection = async () => {
    peerConnection = new RTCPeerConnection(rtcSettings);
    remote = new MediaStream(); // Initialize an empty MediaStream for remote video

    // Attach remote stream to remote video element
    remoteVideo.srcObject = remote;
    remoteVideo.style.display = "block";
    remoteVideo.classList.remove("hidden");
    localVideo.classList.add("smallFrame");

    if (local) {
      local.getTracks().forEach(track => {
          peerConnection.addTrack(track, local);
          console.log("Local track added:", track);
      });
  } else {
      console.error("Local stream not available.");
  }


        peerConnection.ontrack = (event) => {
          console.log("Remote track received:", event);
  
          if (event.streams && event.streams[0]) {
              // Add each track to the remote video stream
              event.streams[0].getTracks().forEach(track => {
                  remoteVideo.srcObject.addTrack(track);  // Add remote track to video element's MediaStream
              });
          } else {
              console.error("No remote streams available.");
          }
      };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate");
            socket.emit("signalingMessage", {
                room,
                message: JSON.stringify({ type: "candidate", candidate: event.candidate })
            });
        }
    };

    peerConnection.onconnectionstatechange = event => {
      if(event.target.connectionState === "connected"){
          console.log("Connected");
      }
    }
  
};

const handleSignalingMessage = async (message) => {
    let { type, offer, answer, candidate, endCall } = JSON.parse(message.message);
    console.log("Received signaling message:", message);

    if (type === "offer") handleOffer(offer);
    if (type === "answer") handleAnswer(answer);
    if (type === "candidate" && peerConnection) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (err) {
            console.log("Failed to add ICE candidate", err);
        }
    }
    if (type === "endCall") {
      console.log("hang up CALL");
      hangUp(); 
    }
};

const handleOffer = async (offer) => {
    if (peerConnection.signalingState === "stable") {
        console.log("Peer connection already in stable state, offer ignored.");
        return;
    }
    try {
        console.log("Received offer:", offer);
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signalingMessage", {
            room,
            message: JSON.stringify({ type: "answer", answer }),
        });
        console.log("Answer sent and remote description set.");
        inCall = true;
    } catch (error) {
        console.error("Error handling offer:", error);
    }
};

const handleAnswer = async (answer) => {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error setting remote description:', error);
    }
};

videoCallBtn.addEventListener('click', function() {
    socket.emit("startVideoCall", { room, name: submitInput.value });
});

socket.on("incommingCall", function(roomCall) {
    IncommingCall.classList.remove("hidden");
    incomCallName.textContent = roomCall.name;
});

answer.addEventListener('click', function() {
    socket.emit("acceptVideoCall", room);
    IncommingCall.classList.add("hidden");
    callContainer.classList.remove("hidden");
    document.querySelector(".main").classList.add("hidden");
    initialize();
});
decline.addEventListener('click', function(){
    IncommingCall.style.display = 'none';
    socket.emit("rejectCall",room);
});
socket.on("callRejected", function(){
    alert("call Rejected");
    });
socket.on("startVideoCall", function() {
    initialize();
    callContainer.classList.remove("hidden");
    document.querySelector(".main").classList.add("hidden");
});

callEnd.addEventListener('click', function() {
    hangUp();
});

const hangUp = () => {
    if (peerConnection) {
      inCall = false;
        // Close peer connection

        peerConnection.close();
        peerConnection = null;
    
        // Set peerConnection to null
        console.log("Closing peer connection:", peerConnection);

       

        // Stop all local media tracks (both audio and video)
        if (local) {
            local.getTracks().forEach(track => track.stop());
            local = null;
            console.log("Local stream stopped:", local);
        }
        // Stop all remote media tracks
        if (remote) {
            remote.getTracks().forEach(track => track.stop());
            remote = null;
            console.log("Remote stream stopped:", remote);
        }

        // Emit 'endCall' event to the other user
        socket.emit("signalingMessage", {
            room,
            message: JSON.stringify({ type: "endCall" })
        });

        // Reset the UI
        callContainer.classList.add("hidden");
        document.querySelector(".main").classList.remove("hidden");
        console.log("Hang up completed");
    } else {
        console.log("Peer connection is already null.");
    }
};

let timerCallEnd;
socket.on("callEnded", function() {
    callEndText.classList.remove("hidden");
    clearTimeout(timerCallEnd);
    timerCallEnd = setTimeout(function() {
        callEndText.classList.add("hidden");
    }, 1200);

    hangUp(); // Ensure hangUp is called on call end
});

leavebtn.addEventListener('click', function() {
  if (room  ) {
    socket.emit('leaveRoom', room);
    document.querySelector(".right-part").style.display = 'none';
    }
  
});

socket.on('leftRoom', function(leftRoom) {
    if (room === leftRoom) {
        room = null;
        if(window.innerWidth <=  640){
            document.querySelector(".left-part").style.display = "block";
            document.querySelector(".welcomeArea").style.display = "none";
        
           }
           else{
            document.querySelector(".welcomeArea").style.display = "flex";
           document.querySelector(".right-part").style.display = "none";

           }
           
           chatMessages.innerHTML = '';
            username.textContent = '';
    }
});

const muted = () => {
  let isMuted = false;
  const muteButton = document.querySelector(".mutedButton");
  const muteIcon = document.querySelector("#muteIcon");

muteButton.addEventListener("click", function() {
    isMuted = !isMuted;
if(isMuted){
  muteIcon.style.color = "grey";

} 
else{
  muteIcon.style.color = "white";
}

    local.getAudioTracks().forEach(track => {
        track.enabled = !isMuted; 
    });

    muteIcon.className = isMuted ? "ri-mic-off-fill" : " ri-mic-fill";
});

}
const cameraOff = () =>{
  const cameraButton = document.querySelector('.cameraButton');
const cameraIcon = document.querySelector('#cameraIcon');

let isCameraOff = false;

cameraButton.addEventListener('click', () => {
  isCameraOff = !isCameraOff;
  
  cameraIcon.className = isCameraOff ? "ri-video-off-fill" : "ri-video-on-fill";

  if (isCameraOff) {
    cameraIcon.style.color = 'grey'; 
    localVideo.classList.add("hidden");
    cameraOffBg.classList.remove("hidden");
    local.getTracks().forEach(track => {
      if (track.kind === 'video') track.enabled = false; 
    });
  } else {
    cameraIcon.style.color = 'white';
    localVideo.classList.remove("hidden");
    cameraOffBg.classList.add("hidden");
    local.getTracks().forEach(track => {
      if (track.kind === 'video') track.enabled = true;
    });
  }
});

}

var flag = 0;
back.addEventListener("click", function(){
  if(flag === 0){
    callContainer.style.height = "30vw";
    callContainer.style.width = "50vw";
    callContainer.style.bottom = "5%"
    document.querySelector(".main").classList.remove("hidden");
    
    flag = 1;
  }
  else{
    callContainer.style.height = "100vh";
    callContainer.style.width = "100vw";
    document.querySelector(".main").classList.add("hidden");
    callContainer.style.bottom = "0%"
    flag = 0;
  }


})





muted();
cameraOff();

