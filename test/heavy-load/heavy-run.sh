#!/bin/bash
echo "========================================================================="
echo "|"
if [ -z $NUMBER_OF_GROUPS ]
then 
  echo "| NUMBER OF GROUPS = 10"
else
  echo "| NUMBER OF GROUPS = $NUMBER_OF_GROUPS"
fi
if [ -z $NUMBER_OF_MESSAGES ]
then 
  echo "| NUMBER OF MESSAGES PER GROUP = 100"
else
  echo "| NUMBER OF MESSAGES PER GROUP = $NUMBER_OF_MESSAGES"
fi
if [ -z $NUMBER_OF_CONSUMERS ]
then 
  echo "| NUMBER OF CONSUMERS PER GROUP = 10"
else
  echo "| NUMBER OF CONSUMERS PER GROUP = $NUMBER_OF_CONSUMERS"
fi
echo "|"
echo "========================================================================="
echo ""

echo "  CREATE A LOG DIRECTORY ./log"
mkdir -p ./log
echo ""
echo "  CORE 1 START IN BACKGROUND"
nohup node produce-consume-core-1.test.js > ./log/1.out 2>./log/1.error &
echo ""
echo "  CORE 2 START IN BACKGROUND"
nohup node produce-consume-core-2.test.js > ./log/2.out 2>./log/2.error &
echo ""
echo "  CORE 3 START IN BACKGROUND"
nohup node produce-consume-core-3.test.js > ./log/3.out 2>./log/3.error &
echo ""
echo "  CORE 4 START IN BACKGROUND"
nohup node produce-consume-core-4.test.js > ./log/4.out 2>./log/4.error &
echo ""
echo "  DONE"
echo "========================================================================="
