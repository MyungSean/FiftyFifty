// toggleAddQueModal("show");
// togglePutNameModal("show");

// url에서 index.html 없애기
var link = window.location.href;
var link = link.split('index.html')[0];
window.history.replaceState( null, null, link );


// =================페이지=================
let areas = Array.from(document.getElementsByClassName("area"));
intro_area = document.getElementsByClassName("intro_area")[0];
game_area = document.getElementsByClassName("game_area")[0];
result_area = document.getElementsByClassName("result_area")[0];
list_area = document.getElementsByClassName("list_area")[0];

selectTotQue = document.getElementById("selectTotQue");
game19 = document.getElementById('game19')

startBtn = document.getElementById("startBtn");
matchBtn = document.getElementById("matchBtn");


// 매치모드일 때 환경 변경
function startMatchMode() {
    // 매치 버튼 표시
    startBtn.style.display = "none";
    matchBtn.style.display = "block";

    // 질문 갯수 선택 미표시
    selectTotQue.closest("form").style.display = "none";

    // 19금 필터 미표시
    game19.closest("div").style.display = "none";

    // 게임 시작 버튼에 매치 대상의 이름 표시
    matchBtn.getElementsByTagName("span")[0].innerHTML = targetName;
}

// URL 파라미터에서 세트 정보 확인하기
function getParam() {
    var params = location.search.substr(location.search.indexOf("?") + 1);
    if ( params !== "" ) {
        targetSetId = params;
        database.ref('records/' + targetSetId).once("value").then(function(snapshot) {
            targetName = snapshot.val().name;
            targetSet = snapshot.val().record;
            console.log(targetName, targetSet);

            // 매치 모드 시작
            startMatchMode();

        }).catch(function(error) {
            alert("잘못된 경로입니다.");          
        })
    } else {
        startBtn.style.display = "block";
        matchBtn.style.display = "none";    
    }
}
getParam();


// 페이지 이동
function moveTo(area) {
    areas.forEach(a => {
        a.style.display = "none";
    });

    if ( area == "intro" ) {
        intro_area.style.display = "block";
    } else if ( area == "game" ) {
        game_area.style.display = "block";
    } else if ( area == "result" ) {
        result_area.style.display = "block";
    } else if ( area == "list" ) {
        list_area.style.display = "block";
    }
}

window.addEventListener('popstate', e => {
    // console.log(e.state);
    if ( e.state !== null ) {
        moveTo(e.state);
    } else{
        moveTo('intro');
    }
})




// =================질문 답변=================
// 답변 선택
function selectAnswer(id, answer) {
    database.ref('questions/' + id).update({
        views: firebase.database.ServerValue.increment(1),
    })

    if ( answer == "ans1" ) {
        database.ref('questions/' + id).update({
            select_1: firebase.database.ServerValue.increment(1)
        })
    } else if ( answer == "ans2" ) {
        database.ref('questions/' + id).update({
            select_2: firebase.database.ServerValue.increment(1)
        })
    }

    changePopularity(id);

}

// 답변 비율 계산
function calcRatio(id, answer) {
    return database.ref('questions/' + id).once('value').then(function(snapshot) {
        var select_1 = snapshot.val().select_1;
        var select_2 = snapshot.val().select_2;
        var percent_1 = Math.round( select_1 / (select_1 + select_2) * 100);

        if ( answer == "ans1" ) {
            return percent_1;
        } else if ( answer == "ans2" ) {
            return 100 - percent_1;            
        }
    })
}

// 결과 표시
function showResult(id, answer) {
    // 답변 비율 표시
    calcRatio(id, "ans1").then(function(percent_1) {
        
        var ans1 = document.getElementById(id).getElementsByClassName('ans1')[0];
        var ans2 = document.getElementById(id).getElementsByClassName('ans2')[0];
        ans1.style.flexBasis = percent_1.toString() + "%";
        
        var result_1 = document.createElement("div");
        result_1.innerHTML = percent_1.toString() + "%";
        var result_2 = document.createElement("div");
        result_2.innerHTML = (100 - percent_1).toString() + "%";
        ans1.appendChild(result_1);
        ans2.appendChild(result_2);

    })

    // 선택한 답변에 클래스 추가
    var que = document.getElementById(id);
    if ( answer == "ans1" ) {
        que.getElementsByClassName("ans")[0].classList.add("select");
    } else {
        que.getElementsByClassName("ans")[1].classList.add("select");
    }
}

// 인게임 결과 표시
function showResult_ingame(id, answer) {
    calcRatio(id, "ans1").then(function(percent_1) {
        
        var game_area = document.getElementsByClassName("game_area")[0];
        var ans1 = game_area.getElementsByClassName('ans1')[0];
        var ans2 = game_area.getElementsByClassName('ans2')[0];
        ans1.style.flexBasis = percent_1.toString() + "%";
        
        var result_1 = document.createElement("div");
        result_1.innerHTML = percent_1.toString() + "%";
        var result_2 = document.createElement("div");
        result_2.innerHTML = (100 - percent_1).toString() + "%";
        ans1.appendChild(result_1);
        ans2.appendChild(result_2);
    })
    
    // 선택한 답변에 클래스 추가
    if ( answer == "ans1" ) {
        game_area.getElementsByClassName("ans")[0].classList.add("select");
    } else {
        game_area.getElementsByClassName("ans")[1].classList.add("select");
    }
}


// 인기도 계산
function changePopularity(id) {
    database.ref('questions/' + id).once('value').then(function(snapshot) {
        var lastChange = snapshot.val().lastChange;
        
        // 마지막 수정 후로 지난 시간 분단위로 구하기
        var timeInterval = ( Date.now() - lastChange ) / 1000 / 60 ;

        // 마지막 수정 후 1분 넘게 지났을 때
        if ( timeInterval > 1 ) {
            var views = snapshot.val().views;
            var skips = snapshot.val().skips;
            var reports = snapshot.val().reports;
            var date = snapshot.val().date;

            var edt = new Date();
            var sdt = new Date(date.split(" ")[0]);
            var sdt = new Date(date);
            var dateDiff = Math.round((edt.getTime()-sdt.getTime())/(1000*3600*24)*1000)/1000;

            // 인기도 계산 공식
            var hot = ( (views*10) - (skips*1) - (reports*10) ) / ( (Math.pow((dateDiff*0.1), 4) + 1) )
            // console.log(hot);

            var currDate = Date.now();

            database.ref('questions/' + id).update({
                hot: Math.round(hot),
                lastChange: currDate
            })
        }
    })
}


// 답변 중복 선택 방지
function preventRepeat(id) {
    checked = $('#'+id).hasClass('checked');

    // 이미 선택 했을 때
    if ( checked ) {
        alert('이미 이 질문에 답하셨습니다.');
        return true;
    }
    
    // 최초 선택일 때
    document.getElementById(id).classList.add("checked");
    return false;
}


// 질문 신고
function report(id) {
    database.ref('questions/' + id).update({
        reports: firebase.database.ServerValue.increment(1)
    })
}


// 리스트에 질문 추가
function prependQue(queId) {
    database.ref("questions").child(queId).once("value").then(function(snapshot) {
        
        var state = snapshot.val().state;
        if ( state !== "active" ) {
            return;
        }
        
        var que = snapshot.val().question;
        var ans1 = snapshot.val().answer_1;
        var ans2 = snapshot.val().answer_2;
        var views = snapshot.val().views;
        
        var list = document.createElement("li");
        list.setAttribute("id", queId);

        var filter19 = snapshot.val().filter19;
        if ( filter19 ) {
            list.setAttribute("class", "forAdult");
        }
        
        var html = "";
        var html = '<span class="viewsBox">조회수: <span class="views">' + views.toString() + '</span></span>' +
        '<span class="que">' + que + '<span class="report"><i class="ri-alarm-warning-fill"></i></span></span>' +
        '<span class="ansWrap">' +
        '<span class="ans ans1">' + ans1 + '</span>' +
        '<span class="ans ans2">' + ans2 + '</span>' +
        '</span>';
        
        list.innerHTML = html;
        document.getElementById('queList').prepend(list);

        // 19금 필터 꺼져있을 때 19금 질문 표시
        if ( !show19.checked ) {
            $(".forAdult").show();
        }
        
    })
}

// 질문 제목으로 검색
function searchByQue(que) {
    var searchWord = que;

    database.ref("questions").orderByChild('views').once("value").then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            var que = childSnapshot.val().question;

            // 오류 방지
            if ( que == undefined ) {
                return
            }

            if ( que.includes(searchWord) ) {
                var queId = childSnapshot.key;
                prependQue(queId);
            }

        })

    })
}

// 질문 답변으로 검색
function searchByAns(ans) {
    var searchWord = ans;

    database.ref("questions").orderByChild('views').once("value").then(function(snapshot) {

        snapshot.forEach(function(childSnapshot) {
            var ans1 = childSnapshot.val().answer_1;
            var ans2 = childSnapshot.val().answer_2;

            // 오류 방지
            if ( ans1 == undefined || ans2 == undefined ) {
                return
            }

            if ( ans1.includes(searchWord) || ans2.includes(searchWord) ) {
                var queId = childSnapshot.key;
                prependQue(queId);
            }
        })

    })
}

// 댓글 열기 버튼 추가
function addCommentBtn(queId) {
    var queLi = document.getElementById(queId);
    var openCommentBtn = document.createElement("div");
    openCommentBtn.classList.add("openCommentBtn");
    openCommentBtn.innerHTML = "댓글 확인하기";
    queLi.appendChild(openCommentBtn);
}



// 질문 리스트 받아오기, 답변 클릭 이벤트
function showQueList(sortBy) {
    document.getElementById("queList").innerHTML = "";

    database.ref( 'questions' ).orderByChild(sortBy).once('value').then(function(snapshot) {
    
        snapshot.forEach(function (childSnapshot) {
    
            var queId = childSnapshot.key;
    
            prependQue(queId);
    
        });

        
    })
}




// 답변 클릭
$(document).on("click", ".list_area .ans", function() {
    var id = $(this).closest('li').attr('id');

    // 중복 답변 방지
    if ( preventRepeat(id) ) {
        return;
    };

    if ( $(this).hasClass("ans1") ) {
        var answer = "ans1";
    } else if ( $(this).hasClass("ans2") ) {
        var answer = "ans2";
    }
    
    selectAnswer(id, answer);
    showResult(id, answer)
    // addCommentBtn(id);
})

// 질문 신고
$(document).on("click", ".list_area .report", function() {
    if ( $(this).hasClass('disable') ) {
        return;
    }

    var r = confirm("부적절한 질문으로 신고하시겠습니까?");
    if( r == true ){
        var id = $(this).closest('li').attr('id');
        report(id);
        $(this).addClass('disable');
    }
})


// 질문 리스트 보기
$('.showListBtn').click(function() {
    history.pushState('list', 'list', './');
    moveTo("list");
})

// 질문 리스트 닫기
$('.closeListBtn').click(function() {
    history.pushState('intro', 'intro', './');
    moveTo("intro");
})

// 질문 검색
document.getElementById("searchQueBtn").addEventListener("click", function(e) {
    e.preventDefault();

    document.getElementById("queList").innerHTML = "";

    document.getElementsByClassName("sortBy")[0].style.display = "none";
    document.getElementById("showAllQue").style.display = "block";

    var by = document.getElementById("by").value;
    var searchWord = document.getElementById("searchWord").value;

    if ( by == "que" ) {
        searchByQue(searchWord);
    } if ( by == "ans" ) {
        searchByAns(searchWord);
    }
})


// 질문 정렬
showQueList('hot'); // 기본 정렬
sortByBtn = document.getElementsByClassName("sortBy")[0].getElementsByTagName("span");
// 인기순
sortByBtn[0].addEventListener("click", function() {
    showQueList("hot");
    $('.sortBy span').removeClass("select");
    sortByBtn[0].classList.add("select");
})
// 조회순
sortByBtn[1].addEventListener("click", function() {
    showQueList("views");
    $('.sortBy span').removeClass("select");
    sortByBtn[1].classList.add("select");
})
// 최신순
sortByBtn[2].addEventListener("click", function() {
    showQueList("date");
    $('.sortBy span').removeClass("select");
    sortByBtn[2].classList.add("select");
})

// 질문으로 돌아가기 클릭
document.getElementById("showAllQue").addEventListener("click", function() {
    document.getElementsByClassName("sortBy")[0].style.display = "block";
    document.getElementById("showAllQue").style.display = "none";

    showQueList("hot");
    $('.sortBy span').removeClass("select");
    sortByBtn[0].classList.add("select");
})

// 19금 질문 필터
show19 = document.getElementById('show19')
show19.addEventListener('change', (e) => {
  if (e.currentTarget.checked) {
    alert('19금 질문이 표시되지 않습니다.');
    $(".forAdult").slideUp();
} else {
    alert('모든 질문이 표시됩니다.');
    $(".forAdult").slideDown();
  }
})

// 댓글 보기
$(document).on("click", ".openCommentBtn", function() {
    // console.log($(this).closest("li").attr("id"));
})


//스크롤이 맨 끝에 내려왔을때 리스트 추가 로드
$(window).scroll(function() {
    var scrolltop = $(window).scrollTop(); 

    // 페이지 끝까지 내려 왔을 떄
    if( scrolltop == $(document).height() - $(window).height() ){

        if ( history.state == "list" ) {
            console.log("리스트 추가 로드 실행");
        }

    }
});



// =================게임 진행=================
var ansDict = [];
startBtn = document.getElementById("startBtn");
skipBtn = document.getElementById("skipBtn");
confirmBtn = document.getElementById("confirmBtn");
showResultBtn = document.getElementById("showResultBtn");

// 질문 아이디 리스트 만들기
function makeIdList() {
    return database.ref('questions').orderByChild('hot').limitToLast(100).once('value').then(function(snapshot) {
        
        var idList = [];
        snapshot.forEach(function(childSnapshot) {
            var id = childSnapshot.key;
            idList.push(id);
        })

        return idList.reverse();

    })
}

// 다음 질문으로 넘어가기
function nextQue() {

    // 비율 초기화
    var ans1 = game_area.getElementsByClassName('ans1')[0];
    ans1.style.flexBasis = "50%";

    // 질문 불러오기
    if ( idList.constructor == Promise ) {
        // 일반 게임일 때
        idList.then(function(data){
            queCntHtml = document.getElementById("queCnt").innerHTML
            queCnt = Number(queCntHtml);
            document.getElementById("queCnt").innerHTML = queCnt + 1;
    
            var id = data[queCnt];
    
            queWrap = document.getElementsByClassName("queWrap")[0];
            queWrap.setAttribute("name", id);
    
            database.ref('questions/' + id).once('value').then(function(snapshot) {
                game_area = document.getElementsByClassName("game_area")[0];
    
                // 활성화된 질문만 보여주기
                var state = snapshot.val().state;
                if ( state !== "active" ) {
                    nextQue();
                    return;
                }

                // 19금 질문 필터링
                var filter19 = snapshot.val().filter19;
                if ( game19.checked ) {
                    if ( filter19 == true ) {
                        nextQue();
                        return;
                    }                    
                }
                
                que = snapshot.val().question;
                ans1 = snapshot.val().answer_1;
                ans2 = snapshot.val().answer_2;
                views = snapshot.val().views;
    
                game_area.getElementsByTagName("h2")[0].innerHTML = que;
                game_area.getElementsByClassName("ans1")[0].innerHTML = ans1;
                game_area.getElementsByClassName("ans2")[0].innerHTML = ans2;
                game_area.getElementsByClassName("views")[0].innerHTML = views;
            })
        })
    } else if ( idList.constructor == Array ) {
        // 매치 게임일 때
        queCntHtml = document.getElementById("queCnt").innerHTML
        queCnt = Number(queCntHtml);
        document.getElementById("queCnt").innerHTML = queCnt + 1;

        var id = idList[queCnt];

        queWrap = document.getElementsByClassName("queWrap")[0];
        queWrap.setAttribute("name", id);

        database.ref('questions/' + id).once('value').then(function(snapshot) {
            game_area = document.getElementsByClassName("game_area")[0];

            // 활성화된 질문만 보여주기
            state = snapshot.val().state;
            if ( state !== "active" ) {
                nextQue();
                return;
            }
            
            que = snapshot.val().question;
            ans1 = snapshot.val().answer_1;
            ans2 = snapshot.val().answer_2;
            views = snapshot.val().views;

            game_area.getElementsByTagName("h2")[0].innerHTML = que;
            game_area.getElementsByClassName("ans1")[0].innerHTML = ans1;
            game_area.getElementsByClassName("ans2")[0].innerHTML = ans2;
            game_area.getElementsByClassName("views")[0].innerHTML = views;
        })
    }

    // 신고버튼 비활성화 초기화
    $('.game_area .report').removeClass("disable");

    // 다음 단계 버튼 초기화
    if ( idList.constructor == Promise ) {
        skipBtn.style.display = "block";
    }
    confirmBtn.style.display = "none";
    showResultBtn.style.display = "none";

    // 선택한 답변 초기화
    $('.game_area .ans').removeClass("select")

}

// 전체 질문 개수 설정
function setTotQue() {
    if ( typeof(targetSet) == "undefined" ) {
        // 매치 게임 아닐 때
        var totQue = selectTotQue.value;
    } else {
        // 매치 게임일 때
        var totQue = Object.keys(targetSet).length;
    }

    document.getElementById("totQue").innerHTML = totQue;
}

// 질문 건너뛰기 카운트
function skipQueCnt(id) {
    database.ref('questions/' + id).update({
        skips: firebase.database.ServerValue.increment(1),
    })    
}


// 다음 단계 버튼 표시
function showNextStepBtn() {
    currQueHtml = document.getElementById("currQue").innerHTML
    currQue = Number(currQueHtml);
    totQueHtml = document.getElementById("totQue").innerHTML
    totQue = Number(totQueHtml);

    skipBtn.style.display = "none";
        if ( currQue == totQue ) {
        showResultBtn.style.display = "block";
    } else {
        confirmBtn.style.display = "block";
    }
}

// 답변 저장하고 다음 단계로 넘어가기
function confirmAns(id, answer) {
    ansDict[id] = answer;
}

// 현재 문제 단계 카운트
function currQueCnt() {
    currQueHtml = document.getElementById("currQue").innerHTML
    currQue = Number(currQueHtml);
    document.getElementById("currQue").innerHTML = currQue + 1;    
}

// 게임 결과 표시
function showGameResult() {
    // 이름 표시
    userName = document.getElementById("putNameModal").getElementsByTagName("input")[0].value;
    document.getElementsByClassName("userName")[0].innerHTML = userName; // 대중도
    document.getElementsByClassName("userName")[1].innerHTML = userName; // 친구 일치도

    var totPercent = 0;

    Object.entries(ansDict).forEach(([id], index) => {
        // 결과 표 초기화
        resultTable = document.getElementById("resultTable");
        resultTable.innerHTML = "";

        // 결과를 표로 표시
        database.ref('questions/' + id ).once("value").then(function(snapshot) {
            var que = snapshot.val().question;
            var ans1 = snapshot.val().answer_1;
            var ans2 = snapshot.val().answer_2;
            var select_1 = snapshot.val().select_1;
            var select_2 = snapshot.val().select_2;

            var percent_1 = Math.round( select_1 / (select_1 + select_2) * 100);
            
            var tr = document.createElement("tr");
            var td = "";
            var td = `<tr>
            <td>${que}</td>
            <td>${ans1}(${percent_1}%)</td>
            <td>${ans1}(${100-percent_1}%)</td>
            </tr>`;
            tr.innerHTML = td;
            
            // 선택한 답변에 클래스 추가
            if ( ansDict[id] == "ans1" ) {
                tr.getElementsByTagName("td")[1].className = "choosed";
            } else if ( ansDict[id] == "ans2" ) {
                tr.getElementsByTagName("td")[2].className = "choosed";
            }

            resultTable.append(tr);
            $('#resultTable tr').hide();

            // 대중도 표시
            calcRatio(id, ansDict[id]).then(function(percent) {
                totPercent = totPercent + percent;
                dictLength = Object.keys(ansDict).length;

                if ( index + 1 == dictLength ) {
                    var avgPercent = totPercent / dictLength;
                    document.getElementById("avgPercent").innerHTML = Math.round(avgPercent);

                    showPercent(Math.round(avgPercent));
                }
            })
        })
    })
}

// 게임 기본 세팅
function gameSetting() {
    var ansDict = [];
    
    document.getElementById("currQue").innerHTML = 1;
    setTotQue();
    nextQue();
    
    history.pushState('game', 'game', './');
    moveTo("game");
}

// 19금 질문 필터
game19.addEventListener('change', (e) => {
  if (e.currentTarget.checked) {
    alert('19금 질문이 표시되지 않습니다.');
} else {
    alert('모든 질문이 표시됩니다.');
  }
})

// 시작 버튼 클릭
startBtn.addEventListener('click', e => {
    idList = makeIdList();
    gameSetting();
});

// 답변 클릭
$('.game_area .ans').click(function() {
    var id = $(this).closest('.queWrap').attr('name');
    
    if ( preventRepeat(id) ) {
        return;
    };
    
    if ( $(this).hasClass("ans1") ) {
        var answer = "ans1";
    } else if ( $(this).hasClass("ans2") ) {
        var answer = "ans2";
    }
    
    selectAnswer(id, answer);
    confirmAns(id, answer);
    showResult_ingame(id, answer);
    showNextStepBtn();
})

// 건너뛰기 버튼 클릭
document.getElementById("skipBtn").addEventListener("click", function() {
    var id = game_area.getElementsByClassName("queWrap")[0].getAttribute("name");
    skipQueCnt(id);
    nextQue();
})

// 다음 질문 버튼 클릭
document.getElementById("confirmBtn").addEventListener("click", function() {
    nextQue();
    currQueCnt();
});

// 결과 확인 클릭
document.getElementById("showResultBtn").addEventListener("click", function() {
    togglePutNameModal("show");
});

// 이름 제출 후 결과 창으로 이동
document.getElementById("nameSubmitBtn").addEventListener("click", function(e) {
    e.preventDefault();
    togglePutNameModal("hide")

    makeSetId();
    showGameResult();
    matchAns();

    history.pushState('result', 'result', './');
    moveTo("result");
})

// 질문 신고
$('.game_area .report').click(function(){
    if ( $(this).hasClass('disable') ) {
        return;
    }

    var r = confirm("부적절한 질문으로 신고하시겠습니까?");
    if( r == true ){
        var id = game_area.getElementsByClassName("queWrap")[0].getAttribute("name");
        report(id);
        $(this).addClass('disable');
    }
})



// =================매치 게임=================
// 매치 게임 기본 세팅
function matchSetting() {
    // 총 질문 수 표시
    document.getElementById("totQue").innerHTML = idList.length;    

    // 건너뛰기 숨기기
    document.getElementsByClassName("nextQueBtn")[0].style.display = "none";
}

// 일치도 검사
function matchAns() {
    if ( typeof(targetSet) == "undefined" ) {
        return;
    }

    var j = 0;  // 일치하는 답변 갯수

    var ansId = Object.keys(targetSet);
    for (let i = 0; i < ansId.length; i++) {
        var id = ansId[i];
        var targetAns = targetSet[id];
        var myAns = ansDict[id];

        // 친구와 답변 일치했을 때
        if ( targetAns == myAns ) {
            var j = j + 1;
        }
    }
    
    var conformity = j / ansId.length * 100;
    document.getElementById("targetName").innerHTML = targetName;
    document.getElementById("conformity").innerHTML = Math.round(conformity);

    document.getElementsByClassName("matchResult")[0].style.display = "block";
}


// 시작 버튼 클릭
matchBtn.addEventListener('click', e => {
    idList = Object.keys(targetSet);
    matchSetting();
    gameSetting();
});




// =================게임 결과 표시=================
circle = document.getElementsByClassName("box")[0].getElementsByTagName("circle")[1];
numberBox = document.getElementsByClassName("box")[0].getElementsByClassName("number")[0];
detailResultBtn = document.getElementById("detailResultBtn");

// 퍼센트 표시
function showPercent(percent) {
    var percentMark = document.createElement("h2");
    percentMark.innerHTML = percent + "<span>%</span>";
    numberBox.appendChild(percentMark);

    var percent = (440 - (440 * percent) / 100);
    
    circle.style.strokeDashoffset = percent;
    circle.classList.remove("effect");
    circle.classList.add("effect");
}

detailResultBtn.addEventListener("click", function() {
    $('#resultTable tr').slideToggle();
})

// 게임 다시 하기 버튼 클릭
$('.tryAgainBtn').click(function() {
    history.pushState('intro', 'intro', './');
    moveTo("intro");
})
// moveTo("result");


// =================소셜 공유(사이트)=================
siteShareBtns = document.getElementsByClassName("shareSite")[0].getElementsByTagName("button");

// 카카오톡 공유
function kakaoSiteShare() {
    Kakao.Link.sendDefault({
      objectType: 'feed',
      content: {
        title: '게임 제목 아직 못 정함',
        description: "부먹 찍먹, 누가 더 많을까?",
        imageUrl:
          'http://k.kakaocdn.net/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: '밸런스 게임으로 이동',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
      ],
    })
}

// 페이스북 공유
function facebookSiteShare() {  
    window.open("http://www.facebook.com/sharer/sharer.php?u=" + window.location.href, "공유", "height=500,width=500");
}  

// 링크 복사
function siteLinkCopy() {
    var url = window.location.href;
    var description = "사이트 설명입니다.";
    var createInput = document.createElement("textarea");
    
    document.getElementsByClassName("shareSite")[0].appendChild(createInput);
    createInput.value = `${url}\n${description}`;
    
    createInput.select();
    document.execCommand('copy');
    document.getElementsByClassName("shareSite")[0].removeChild(createInput);
    
    alert('링크가 복사되었습니다.');
}


siteShareBtns[0].addEventListener("click", kakaoSiteShare);
siteShareBtns[1].addEventListener("click", facebookSiteShare);

// 기타 방식으로 공유
siteShareBtns[2].addEventListener("click", function() {
    
    // 공유 기능 가능하면 공유 네비게이션 열고 불가능하면 공유 링크 복사
    if (navigator.share) {
        var title = window.document.title;
        var url = window.document.location.href;

        navigator.share({
            title: `${title}`,
            url: `${url}`
        })
        .catch(console.error);
    } else {
        siteLinkCopy();
    }

})


// =================소셜 공유(결과)=================
resultShareBtns = document.getElementsByClassName("shareResult")[0].getElementsByTagName("button");
shareUrl = document.getElementById("shareUrl");
shareDescription = document.getElementById("shareDescription");


// 해당 세트의 고유값 생성
function makeSetId() {
    setId = database.ref().push().key;
    var url =  window.location.href + "?" + setId;
    
    var userName = document.getElementById("putNameModal").getElementsByTagName("input")[0].value;
    var description = "지금 " + userName + "님과 나의 일치도를 확인해보세요."
    
    shareUrl.value = url;
    shareDescription.value = description;
}

// 게임 기록을 데이터베이스에 저장
function saveRecord() {
    database.ref('records/' + setId).set({
        name: userName,
        record: ansDict
    })
}

// 카카오톡 공유
function kakaoResultShare() {
    var url = shareUrl.value;
    var description = shareDescription.value;

    Kakao.Link.sendDefault({
      objectType: 'feed',
      content: {
        title: '게임 제목 아직 못 정함',
        description: description,
        imageUrl:
          'http://k.kakaocdn.net/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png',
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
      buttons: [
        {
          title: '친구와 일치도 확인하기',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
      ],
    })
}

// 페이스북 공유
function facebookResultShare() {
    var url = shareUrl.value;
    window.open(url, "공유", "height=500,width=500");
}  

// 클립보드에 링크 복사
function copyLink() {
    var shareContent = document.getElementsByClassName("shareContent")[0];
    var url = shareUrl.value;
    var description = shareDescription.value;
    var createInput = document.createElement("textarea");
    
    shareContent.style.display = 'block';
    shareContent.appendChild(createInput);
    createInput.value = `${url}\n${description}`;
    
    createInput.select();
    document.execCommand('copy');
    shareContent.removeChild(createInput);
    shareContent.style.display = 'none';
    
    alert('링크가 복사되었습니다.');
}


// 공유 버튼 클릭했을 때 데이터베이스에 게임 기록 저장
$('.shareBtn').click(function() {
    saveRecord();
})

resultShareBtns[0].addEventListener("click", kakaoResultShare);
resultShareBtns[1].addEventListener("click", facebookResultShare);

// 기타 방식으로 공유
resultShareBtns[2].addEventListener("click", function() {
    
    // 공유 기능 가능하면 공유 네비게이션 열고 불가능하면 공유 링크 복사
    if (navigator.share) {
        var title = window.document.title;
        var description = shareDescription.value;
        var url = shareUrl.value;

        navigator.share({
            title: `${title}`,
            text: `${description}`,
            url: `${url}`
        })
        .catch(console.error);
    } else {
        copyLink();
    }

})



// =================모달=================
addQueBtn = document.getElementById("addQueBtn");
addQueModal = document.getElementById("addQueModal");
newQueSubmitBtn = document.getElementById("newQueSubmitBtn");
putNameModal = document.getElementById("putNameModal");


// 이름 입력 창 토글
function togglePutNameModal(state) {
    if ( state == "show" ) {
        putNameModal.style.display = "block";
    } else if ( state == "hide" ) {
        putNameModal.style.display = "none";        
    }
}

// 질문 추가 모달 토글
function toggleAddQueModal(state) {
    if ( state == "show" ) {
        addQueModal.style.display = "block";
    } else if ( state == "hide" ) {
        addQueModal.style.display = "none";        
    }
}


// 모달 창 밖 클릭시 모달 닫기
$('.modal').click(function(e) {
    $(this).hide();
})
$('.modal-content').click(function(e) {
    e.stopPropagation();  
})

// 모달 닫기 버튼으로 모달 닫기
$('.closeModalBtn').click(function(e) {
    $(this).closest('.modal').hide();
})

// 19금 질문 필터
filter19 = document.getElementById('filter19')
filter19.addEventListener('change', (e) => {
    if (e.currentTarget.checked) {
        alert('19금 질문으로 등록합니다.');
    }
})

// 날짜와 시간 반환
function getDateTime() {
    
    var today = new Date();

    var mm = (today.getMonth()+1);
    var dd = today.getDate();
    var date = today.getFullYear() + '-' + (mm>9 ? '' : '0')+mm+ '-' + (dd>9 ? '' : '0')+dd;
    
    var hh = today.getHours();
    var MM = today.getMinutes();
    var ss = today.getSeconds();
    var time = (hh>9 ? '' : '0')+hh+ ':' + (MM>9 ? '' : '0')+MM+ ':' + (ss>9 ? '' : '0')+ss;

    var dateTime = date+' '+time;
    return dateTime;
}

// 데이터베이스에 질문 추가
function addQue(e) {
    e.preventDefault();
    
    var que = document.getElementById("newQue").value;
    var ans1 = document.getElementById("newAns1").value;
    var ans2 = document.getElementById("newAns2").value;

    var filter19 = document.getElementById("filter19").checked;

    var dateTime = getDateTime();
    var currDate = Date.now();

    database.ref("questions").push().set({
        question: que,
        answer_1: ans1,
        answer_2: ans2,
        select_1: 0,
        select_2: 0,
        state: "active",
        filter19: filter19,
        views: 0,
        skips: 0,
        reports: 0,
        hot: 0,
        date: dateTime,
        lastChange: currDate
    })

    alert("성공적으로 질문이 등록됐습니다!")

    document.getElementById("newQue").value = "";
    document.getElementById("newAns1").value = "";
    document.getElementById("newAns2").value = "";
}


// 질문 추가 버튼 클릭했을 때 모달 나오기
addQueBtn.addEventListener('click', function() {
    toggleAddQueModal("show");
});

// 새로운 질문 등록
newQueSubmitBtn.addEventListener('click', function(e) {
    addQue(e);
    toggleAddQueModal("hide");
});


